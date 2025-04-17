import os
import logging
import boto3
from botocore.exceptions import ClientError
from urllib.parse import urlparse
from .redis_client import redis_manager  # Import the singleton manager


logger = logging.getLogger(__name__)


# Configuration - Ensure these environment variables are set
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL")  # For MinIO/non-AWS S3
S3_REGION = os.getenv("AWS_DEFAULT_REGION", "us-east-1")  # Default if not set


# Initialize S3 client
s3_client = None
if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            endpoint_url=AWS_ENDPOINT_URL,  # Pass endpoint_url for MinIO
            region_name=S3_REGION  # Include region
        )
        logger.info(f"S3 client initialized for endpoint: {AWS_ENDPOINT_URL or 'AWS default'}")
    except Exception as e:
        logger.error(f"Failed to initialize S3 client: {e}")
else:
    logger.warning("S3 credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) not found. Pre-signed URLs cannot be generated.")


def generate_presigned_url(s3_url: str, expiration: int = 3600) -> str | None:
    """
    Generate a presigned URL to retrieve an object from an S3-compatible service.

    Args:
        s3_url: The S3 URL of the object (e.g., http://minio:9000/bucket-name/object-key.gif)
        expiration: Time in seconds for the presigned URL to remain valid.

    Returns:
        The presigned URL as a string, or None if generation fails or S3 client not initialized.
    """
    if not s3_client:
        logger.error("S3 client not initialized. Cannot generate pre-signed URL.")
        return None
    if not s3_url:
        return None

    # Get redis client from manager
    redis_client = redis_manager.get_client()

    # Check Redis cache first
    if redis_client:
        try:
            cached_url = redis_client.get(s3_url)
            if cached_url:
                logger.debug(f"Returning cached pre-signed URL from Redis for: {s3_url}")
                return cached_url
        except Exception as e:
            logger.error(f"Redis GET error for key {s3_url}: {e}. Proceeding to generate new URL.")
    else:
        logger.warning("Redis client not available, cannot check cache.")

    # If not cached or Redis unavailable, generate a new URL
    logger.debug(f"Generating new pre-signed URL for: {s3_url}")
    try:
        # Parse the bucket name and object key from the S3 URL
        # Example URL: http://minio:9000/task-manager/tests/8c507a07.../test_Login_Test/result.gif
        parsed_url = urlparse(s3_url)
        # Path might be /bucket-name/object/key.gif
        path_parts = parsed_url.path.strip('/').split('/', 1)
        if len(path_parts) < 2:
            logger.error(f"Could not parse bucket and key from S3 URL: {s3_url}")
            return None

        bucket_name = path_parts[0]
        object_key = path_parts[1]

        # Generate the presigned URL
        response = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': object_key},
            ExpiresIn=expiration
        )

        # Get redis client again in case it failed initialization initially
        redis_client = redis_manager.get_client()

        # Cache the new URL in Redis with the specified expiration
        if redis_client:
            try:
                # Use Redis SET with EX argument for automatic expiration
                redis_client.set(s3_url, response, ex=expiration)
                logger.debug(f"Cached new pre-signed URL in Redis for {s3_url} with expiration {expiration}s")
            except Exception as e:
                logger.error(f"Redis SET error for key {s3_url}: {e}")
        else:
            logger.warning("Redis client not available, cannot cache new URL.")

        return response
    except ClientError as e:
        logger.error(f"Error generating presigned URL for {s3_url}: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error generating presigned URL for {s3_url}: {e}")
        return None
