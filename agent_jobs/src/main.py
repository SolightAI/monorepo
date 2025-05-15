import asyncio
import json
import logging

import aws_lambda_typing.events as AWSEvents
from aws_lambda_typing.context import Context as LambdaContext
from pydantic import ValidationError

import job_parser
import dispatcher
from .config import ConfigError, get_config


logger = logging.getLogger(__name__)


def lambda_handler(
    event: AWSEvents.SQSEvent,
    context: LambdaContext,
) -> None:
    return asyncio.run(_async_lambda_handler(event, context))


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

    try:
        # Get the configuration
        config = get_config()
        
        # Parse the job from the payload
        job = job_parser.parse_job(body_payload_json)
        
        # Dispatch the job
        await dispatcher.dispatch_job(config, job)
    except ValidationError as e:
        logger.error(f"Failed to parse job: {e}")
        raise Exception(f"Failed to parse job: {e.errors()}")
    except ConfigError as e:
        logger.error(e)
        raise Exception(e)
