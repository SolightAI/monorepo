import asyncio
import json
import logging
import time

from utils.redis_client import get_redis

logger = logging.getLogger(__name__)


def _build_job_key(job_id: str) -> str:
    return f"solight:lambda-webhook:job:{job_id}"


async def create_lambda_waiter_job(job_id: str) -> None:
    redis_client = await get_redis()
    if redis_client is None:
        raise Exception("Redis not available")
    key_job = _build_job_key(job_id)

    if await redis_client.exists(key_job):
        logger.info(f"Job {job_id} already in progress, skipping key creation")
        return

    logger.info(f"Creating job {job_id} key in Redis")
    await redis_client.set(
        key_job, json.dumps({"status": "in_progress"}), ex=1 * 60 * 60
    )


async def wait_for_lambda_result(job_id: str, timeout=900) -> str:
    """
    Wait for a Lambda function to complete and return its result.

    The function will poll the Redis store every 5 seconds and lookup the job status
    until it's completed or the timeout is reached.

    Args:
        job_id: The ID of the job to wait for
        timeout: The maximum time to wait for the job to complete (in seconds)

    Returns:
        The result of the Lambda function

    Raises:
        Exception: If the job is not found or the status is not "success" or "error"
        Exception: If the timeout is reached
        Exception: If the Redis client is not available
    """
    redis_client = await get_redis()
    if redis_client is None:
        raise Exception("Redis not available")

    job_key = _build_job_key(job_id)

    start_time = time.time()
    while True:
        job = await redis_client.get(job_key)
        if job is None:
            raise Exception(f"Job {job_id} not found")

        job_data = json.loads(job)
        status = job_data.get("status")

        if status == "success":
            return job_data.get("result")
        elif status == "error":
            raise Exception(f"Job {job_id} failed")
        elif status == "in_progress":
            if time.time() - start_time > timeout:
                raise Exception(f"Timeout waiting for job {job_id} to complete")

            logger.info(
                f"Waiting for job {job_id} to complete... polling again in 10 seconds"
            )
            await asyncio.sleep(10)
            continue
        else:
            raise Exception(f"Unknown status for job {job_id}: {status}")


async def delete_waiter_job(job_id: str) -> None:
    redis_client = await get_redis()
    if redis_client is None:
        raise Exception("Redis not available")

    key_job = _build_job_key(job_id)

    logger.info(f"Deleting job {job_id} key in Redis")
    await redis_client.delete(key_job)
