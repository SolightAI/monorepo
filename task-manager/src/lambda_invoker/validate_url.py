import json
import logging
import requests
from typing import Any, TypedDict
from urllib.parse import urlparse
import boto3


from config import env
from utils.session_manager import get_redis
from lambda_invoker import lambda_waiter

logger = logging.getLogger(__name__)

LOGIN_PAGE_REDIS_PREFIX = "login_page:"  # Redis key prefix for login pages
LOGIN_PAGE_EXPIRY = 60 * 60 * 24 * 30  # Key expiration time in seconds (30 days)

CONFIDENCE_HIGH = "high"
CONFIDENCE_MEDIUM = "medium"
CONFIDENCE_LOW = "low"


class Config(TypedDict):
    test_aws_lambda_validate_url_endpoint: str | None
    dev_mode: bool
    prod_aws_lambda_queue_trigger_access_key: str | None
    prod_aws_lambda_queue_trigger_secret_key: str | None
    prod_aws_lambda_queue_url: str | None


class Result(TypedDict):
    valid: bool
    confidence: str
    message: str
    login_url: str | None
    original_url: str
    source: str


def _get_config() -> Config:
    dev_mode = env.get_bool("DEV_MODE", False)
    
    # If dev, we're triggering the lambda through a local HTTP endpoint
    test_aws_lambda_validate_url_endpoint = env.get_string(
        "TEST_AWS_LAMBDA_VALIDATE_URL_ENDPOINT", None, dev_mode
    )
    
    # If production, we're triggering the lambda through SQS
    prod_aws_lambda_queue_trigger_access_key = env.get_string(
        "PROD_AWS_LAMBDA_QUEUE_TRIGGER_ACCESS_KEY", None, not dev_mode
    )
    prod_aws_lambda_queue_trigger_secret_key = env.get_string(
        "PROD_AWS_SQS_LAMBDA_QUEUE_TRIGGER_SECRET_ACCESS_KEY", None, not dev_mode
    )
    prod_aws_lambda_queue_url = env.get_string(
        "PROD_AWS_LAMBDA_QUEUE_URL", None, not dev_mode
    )

    return {
        "dev_mode": dev_mode,
        "test_aws_lambda_validate_url_endpoint": test_aws_lambda_validate_url_endpoint,
        "prod_aws_lambda_queue_trigger_access_key": prod_aws_lambda_queue_trigger_access_key,
        "prod_aws_lambda_queue_trigger_secret_key": prod_aws_lambda_queue_trigger_secret_key,
        "prod_aws_lambda_queue_url": prod_aws_lambda_queue_url,
    }


async def validate_url(
    ctx: dict[Any, Any],
    url: str,
    use_cache: bool = True,
) -> Result:
    """
    Endpoint to validate a URL by checking if a login page exists.

    Args:
        ctx: Context dictionary
        url: URL to validate
        use_cache: Whether to use cached results

    Returns:
        Dictionary with validation results
    """
    # TODO(TomChv): This should be refactored to a global config loaded
    # when the binary starts instead of fetching env vars on every call.
    config = _get_config()

    logger.info(f"[{ctx['job_id']}] Starting URL validation for: {url}")

    try:
        if use_cache and (cached_result := await get_login_page_from_cache(url)):
            logger.info(
                f"[{ctx['job_id']}] Login page found in cache for {url}: {cached_result.get('login_url')}"
            )
            return cached_result
    except Exception as e:
        # Continue execution - cache lookup is non-critical
        logger.error(f"[{ctx['job_id']}] Error checking cache for {url}: {str(e)}")

    logger.info(
        f"[{ctx['job_id']}] No cached login page found for {url}, running validation"
    )

    try:
        await lambda_waiter.create_lambda_waiter_job(ctx["job_id"])
        await _trigger_lambda(config, ctx["job_id"], url)

        result_payload = await lambda_waiter.wait_for_lambda_result(ctx["job_id"])

        result = json.loads(result_payload)
        if result["valid"] is True and result["login_url"] is not None:
            logger.info(
                f"[{ctx['job_id']}] Login page saved to cache for {url}: {result['login_url']}"
            )
            await _save_login_page_to_cache(
                url, result["login_url"], result["confidence"]
            )

        return result
    except Exception as e:
        logger.error(f"[{ctx['job_id']}] Error validating URL: {url} - {str(e)}")

        # Return a default failed payload if the requests could not be processed properly.
        return {
            "valid": False,
            "login_url": None,
            "confidence": CONFIDENCE_LOW,
            "message": "An error occurred while validating the URL",
            "original_url": url,
            "source": "validation",
        }
    finally:
        await lambda_waiter.delete_waiter_job(ctx["job_id"])


async def _trigger_lambda(config: Config, job_id: str, url: str) -> None:
    payload = {
        "job_id": job_id,
        "url": url,
    }

    # Comment this block and expose the webhook with ngrok to test locally the complete
    # flow by calling the SQS lambda.
    if config["dev_mode"]:
        # When we send a request to the dev endpoint, we need to wrap the payload
        # in a field body.
        payload = {"Records": [{"body": json.dumps(payload)}]}

        logger.debug(
            f"Sending request {payload} to {config['test_aws_lambda_validate_url_endpoint']}"
        )

        requests.post(
            config["test_aws_lambda_validate_url_endpoint"] or "",
            json=payload,
        )

        return

    # Trigger through SQS topic
    sqs = boto3.client(
        "sqs",
        # Force endpoint URL since we have already AWS_ENDPOINT_URL configured for minio that mess up boto config
        endpoint_url="https://sqs.us-west-1.amazonaws.com",
        aws_access_key_id=config["prod_aws_lambda_queue_trigger_access_key"],
        aws_secret_access_key=config["prod_aws_lambda_queue_trigger_secret_key"],
        region_name="us-west-1",
    )

    queue_url = config["prod_aws_lambda_queue_url"]
    if not queue_url:
        raise ValueError("No queue URL provided")

    sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps(payload))


def _extract_domain(url: str) -> str:
    """
    Extract the domain from a URL.

    Args:
        url: The URL to extract the domain from

    Returns:
        The domain name
    """
    parsed_url = urlparse(url)
    domain = parsed_url.netloc

    # If no netloc (domain) was found, try the path - might be a domain without scheme
    if not domain and parsed_url.path:
        domain = parsed_url.path.split("/")[0]

    # Remove port if present
    domain = domain.split(":")[0]

    # Remove www. prefix if present
    if domain.startswith("www."):
        domain = domain[4:]

    return domain.lower()


async def _save_login_page_to_cache(url: str, login_url: str, confidence: str) -> None:
    """
    Save a discovered login page to Redis cache.

    Args:
        url: The original URL that was validated
        login_url: The URL of the discovered login page
        confidence: Confidence level of the discovery (high, medium, low)
    """
    domain = _extract_domain(url)
    if not domain:
        logger.warning(f"Could not extract domain from URL: {url}")
        return

    logger.info(
        f"Saving login page for domain {domain}: {login_url} (confidence: {confidence})"
    )

    cache_key = f"{LOGIN_PAGE_REDIS_PREFIX}{domain}"

    try:
        # Get Redis client
        # TODO(TomChv): Should be refactored to just call redis.set_ket()
        # instead of handling the key insertion here.
        redis_client = await get_redis()
        if redis_client is None:
            logger.warning("Redis not available, login page will not be cached")
            return

        data = {
            "login_url": login_url,
            "original_url": url,
            "confidence": confidence,
            "found": "true",
        }

        # Store as a hash in Redis
        await redis_client.setex(cache_key, LOGIN_PAGE_EXPIRY, json.dumps(data))  # noqa: F821
        logger.info(f"Login page for domain {domain} cached successfully")
    except Exception as e:
        logger.error(f"Error caching login page for domain {domain}: {str(e)}")
        # Continue execution - caching is a non-critical operation


async def get_login_page_from_cache(url: str) -> Result | None:
    """
    Get a login page from Redis cache based on domain.

    Args:
        url: The URL to get the login page for

    Returns:
        Dictionary with login page data if found, None otherwise
    """
    domain = _extract_domain(url)
    if not domain:
        logger.warning(f"Could not extract domain from URL: {url}")
        return None

    logger.info(f"Checking cache for login page for domain: {domain}")

    cache_key = f"{LOGIN_PAGE_REDIS_PREFIX}{domain}"

    try:
        # Get Redis client
        # TODO(TomChv)redis_client should be a globally available instance so we don't
        # need to so these checks heres and can simply call redis.get.
        # Ideally we could wrap it to a utility function that will directly
        # publish the result in the given struct with a generic (if that's)
        # doable in Python.
        redis_client = await get_redis()
        if redis_client is None:
            logger.warning("Redis not available, cannot check login page cache")
            return None

        # Get data from Redis
        data = await redis_client.get(cache_key)
        if data:
            # Redis returns bytes, decode and parse JSON
            cached_data = json.loads(
                data.decode("utf-8") if isinstance(data, bytes) else data
            )
            if cached_data.get("found") == "true":
                logger.info(
                    f"Login page for domain {domain} found in cache: {cached_data.get('login_url')}"
                )
                return {
                    "valid": True,
                    "login_url": cached_data.get("login_url"),
                    "confidence": cached_data.get("confidence", CONFIDENCE_MEDIUM),
                    "message": "Login page found successfully (from cache)",
                    "original_url": cached_data.get("original_url", url),
                    "source": "cache",
                }
    except Exception as e:
        logger.error(
            f"Error retrieving login page from cache for domain {domain}: {str(e)}"
        )
        # Continue execution - cache lookup is a non-critical operation

    logger.info(f"No login page found in cache for domain {domain}")
    return None
