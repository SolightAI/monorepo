import asyncio
import json
import logging
import sys

import aws_lambda_typing.events as AWSEvents
from aws_lambda_typing.context import Context as LambdaContext
from pydantic import ValidationError

from .config import ConfigError, get_config
from .job_parser import parse_job
from .dispatcher import dispatch_job

logging.basicConfig(
    level=logging.INFO,
    stream=sys.stdout,
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}',
    force=True,
)

logger = logging.getLogger(__name__)

logger.info("Starting agent job handler")


def lambda_handler(
    event: AWSEvents.SQSEvent,
    context: LambdaContext,
) -> None:
    # Try to manually handle the lambda process event loop to avoid
    # to aggressive closing that may make the program crash and trigger
    # an unwanted retry.
    loop = asyncio.get_event_loop()
    if loop.is_closed():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    try:
        return loop.run_until_complete(_async_lambda_handler(event, context))
    finally:
        # Optionally, cancel lingering tasks
        tasks = [t for t in asyncio.all_tasks(loop) if not t.done()]
        if tasks:
            for t in tasks:
                t.cancel()
            loop.run_until_complete(asyncio.gather(*tasks, return_exceptions=True))


async def _async_lambda_handler(
    event: AWSEvents.SQSEvent,
    context: LambdaContext,
) -> None:
    sqs_record = event.get("Records")
    if sqs_record is None:
        logger.error("No SQS record found in event")
        return

    if len(sqs_record) != 1:
        logger.error("Expected 1 SQS record, got %d", len(sqs_record))
        return

    message = sqs_record[0]
    body_payload = message.get("body")
    if body_payload is None:
        logger.error("No body payload found in SQS message")
        return

    body_payload_json = json.loads(body_payload)
    logger.info(f"Received job: {body_payload_json}")

    try:
        # Get the configuration
        config = get_config()

        # Parse the job from the payload
        job = parse_job(body_payload_json)

        # Dispatch the job
        await dispatch_job(config, job)
    except ValidationError as e:
        logger.error(f"Failed to parse job: {e}")
        raise Exception(f"Failed to parse job: {e.errors()}")
    except ConfigError as e:
        logger.error(e)
        raise Exception(e)
