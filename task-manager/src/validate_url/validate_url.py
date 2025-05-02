import os
import re
import json
import logging

from typing import Any
from urllib.parse import urlparse
from langchain_openai import ChatOpenAI
from utils.session_manager import get_redis
from browser_use import Agent, Browser, BrowserConfig
from browser_use.browser.context import BrowserContextConfig, BrowserContext


# Setup logging
logger = logging.getLogger(__name__)


LOGIN_PAGE_REDIS_PREFIX = "login_page:"  # Redis key prefix for login pages
LOGIN_PAGE_EXPIRY = 60 * 60 * 24 * 30  # Key expiration time in seconds (30 days)

CONFIDENCE_HIGH = "high"
CONFIDENCE_MEDIUM = "medium"
CONFIDENCE_LOW = "low"


AGENT_CLIENT = ChatOpenAI(
    model="gpt-4.1",
    temperature=0.0,
    timeout=120,
    frequency_penalty=0.5,
)


PROMPT = """
You are an AI assistant tasked with examining a website to find its login page.

Your task is to:
1. Look for login links, buttons, or forms on the current page
2. If you find a login link or button, click on it to navigate to the login page
3. If you're already on the login page, confirm that login elements (username/email field, password field) are present
4. Report your findings

Your goal is to determine if this website has a login page and if it can be found.

After examining the site, provide a conclusion in the following format:
<login_page_detection>
<found>true/false</found>
<login_url>URL of the login page if found</login_url>
<confidence>'{CONFIDENCE_HIGH}'/'{CONFIDENCE_MEDIUM}'/'{CONFIDENCE_LOW}'</confidence>
</login_page_detection>
""".strip().format(CONFIDENCE_HIGH=CONFIDENCE_HIGH, CONFIDENCE_MEDIUM=CONFIDENCE_MEDIUM, CONFIDENCE_LOW=CONFIDENCE_LOW)


# Extract domain from a URL
def extract_domain(url: str) -> str:
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
        domain = parsed_url.path.split('/')[0]

    # Remove port if present
    domain = domain.split(':')[0]

    # Remove www. prefix if present
    if domain.startswith('www.'):
        domain = domain[4:]

    return domain.lower()


# Save login page to cache
async def save_login_page_to_cache(url: str, login_url: str, confidence: str) -> None:
    """
    Save a discovered login page to Redis cache.

    Args:
        url: The original URL that was validated
        login_url: The URL of the discovered login page
        confidence: Confidence level of the discovery (high, medium, low)
    """
    domain = extract_domain(url)
    if not domain:
        logger.warning(f"Could not extract domain from URL: {url}")
        return

    logger.info(f"Saving login page for domain {domain}: {login_url} (confidence: {confidence})")

    cache_key = f"{LOGIN_PAGE_REDIS_PREFIX}{domain}"

    try:
        # Get Redis client
        redis_client = await get_redis()
        if redis_client is None:
            logger.warning("Redis not available, login page will not be cached")
            return

        data = {
            "login_url": login_url,
            "original_url": url,
            "confidence": confidence,
            "found": "true"
        }

        # Store as a hash in Redis
        await redis_client.setex(cache_key, LOGIN_PAGE_EXPIRY, json.dumps(data))
        logger.info(f"Login page for domain {domain} cached successfully")
    except Exception as e:
        logger.error(f"Error caching login page for domain {domain}: {str(e)}")
        # Continue execution - caching is a non-critical operation


# Get login page from cache
async def get_login_page_from_cache(url: str) -> dict[str, Any] | None:
    """
    Get a login page from Redis cache based on domain.

    Args:
        url: The URL to get the login page for

    Returns:
        Dictionary with login page data if found, None otherwise
    """
    domain = extract_domain(url)
    if not domain:
        logger.warning(f"Could not extract domain from URL: {url}")
        return None

    logger.info(f"Checking cache for login page for domain: {domain}")

    cache_key = f"{LOGIN_PAGE_REDIS_PREFIX}{domain}"

    try:
        # Get Redis client
        redis_client = await get_redis()
        if redis_client is None:
            logger.warning("Redis not available, cannot check login page cache")
            return None

        # Get data from Redis
        data = await redis_client.get(cache_key)
        if data:
            # Redis returns bytes, decode and parse JSON
            cached_data = json.loads(data.decode('utf-8') if isinstance(data, bytes) else data)
            if cached_data.get("found") == "true":
                logger.info(f"Login page for domain {domain} found in cache: {cached_data.get('login_url')}")
                return {
                    "valid": True,
                    "login_url": cached_data.get("login_url"),
                    "confidence": cached_data.get("confidence", CONFIDENCE_MEDIUM),
                    "message": "Login page found successfully (from cache)",
                    "original_url": cached_data.get("original_url", url),
                    "source": "cache"
                }
    except Exception as e:
        logger.error(f"Error retrieving login page from cache for domain {domain}: {str(e)}")
        # Continue execution - cache lookup is a non-critical operation

    logger.info(f"No login page found in cache for domain {domain}")
    return None


def _extract_result(result: str) -> tuple[bool, str, str]:
    # Parse the result to determine if a login page was found
    found = "<found>true</found>" in result.lower()
    login_url = ""

    # Extract login URL if available
    login_url_match = re.search(r"<login_url>(.*?)</login_url>", result, re.DOTALL)
    if login_url_match:
        login_url = login_url_match.group(1).strip()

    # Extract confidence
    confidence = CONFIDENCE_LOW
    confidence_match = re.search(r"<confidence>(.*?)</confidence>", result, re.DOTALL)
    if confidence_match:
        confidence = confidence_match.group(1).strip().lower()

    return found, login_url, confidence


async def validate_url(
    ctx: dict[Any, Any],
    url: str,
    use_cache: bool = True,
) -> dict[str, Any]:
    """
    Endpoint to validate a URL by checking if a login page exists.

    Args:
        ctx: Context dictionary
        url: URL to validate
        use_cache: Whether to use cached results

    Returns:
        Dictionary with validation results
    """

    logger.info(f"[{ctx['job_id']}] Starting URL validation for: {url}")

    try:
        if use_cache and (cached_result := await get_login_page_from_cache(url)):
            logger.info(f"[{ctx['job_id']}] Login page found in cache for {url}: {cached_result.get('login_url')}")
            return cached_result
    except Exception as e:
        # Continue execution - cache lookup is non-critical
        logger.error(f"[{ctx['job_id']}] Error checking cache for {url}: {str(e)}")

    logger.info(f"[{ctx['job_id']}] No cached login page found for {url}, running validation")

    # Initialize browser
    browser = Browser(
        config=BrowserConfig(
            headless=os.getenv("HEADLESS", "true").lower() == "true",
        )
    )

    context = BrowserContext(browser=browser, config=BrowserContextConfig(
        minimum_wait_page_load_time=1,
        viewport_expansion=0,
        wait_between_actions=0,
    ))

    try:
        # Setup and run the agent
        agent = Agent(
            task=PROMPT,
            llm=AGENT_CLIENT,
            initial_actions=[{'go_to_url': {'url': url}}],
            browser_context=context,
            use_vision=True,
            enable_memory=False,
        )

        history = await agent.run(max_steps=10)

        # Extract the result
        result = history.final_result()
        if result is None:
            # If no final result, default to not found
            result = "<login_page_detection><found>false</found></login_page_detection>"

        # Parse the result to determine if a login page was found
        found, login_url, confidence = _extract_result(result)

        # Add detailed debug logging when a login page is found
        if found and login_url:
            await save_login_page_to_cache(url, login_url, confidence)

        # Prepare the response
        response = {
            "valid": found,
            "login_url": login_url if found else None,
            "confidence": confidence,
            "message": "Login page found successfully" if found else "Login page could not be found",
            "original_url": url,
            "source": "validation"
        }

        return response

    except Exception as e:
        logger.error(f"[{ctx['job_id']}] Error validating URL: {url} - {str(e)}")

        return {
            "valid": False,
            "login_url": None,
            "confidence": CONFIDENCE_LOW,
            "message": "An error occurred while validating the URL",
            "original_url": url,
            "source": "validation"
        }

    finally:
        # Clean up resources
        await context.close()
        await browser.close()
