import asyncio
import logging

from aws_lambda_typing import events, context as LambdaContext
from pydantic import ValidationError

from src.validate_url.dto import Body
from src.validate_url import agent, config
from src.webhook_sender.client import WebhookSender


logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def lambda_handler(
    event: events.SQSEvent,
    context: LambdaContext.Context,
) -> None:
    return asyncio.run(validate_url(event, context))


async def validate_url(
    event: events.SQSEvent,
    context: LambdaContext.Context,
) -> None:
    """Validate URL by checking if a login page exists.

    Args:
      event: dict, required
        SQS Event


      context: object, required
        Lambda Context runtime methods and attributes

        Context doc: https://docs.aws.amazon.com/lambda/latest/dg/python-context-object.html

    Returns: None

    Raises:
      Exception: If no body is provided in the SQS event
      Exception: If the body is not a valid JSON object of type Body
      Exception: If the agent fails to complete the validation (no matter if it was successful or not)
    """
    conf = config.get()

    try:
        message = event.get("Records")[0]
        body_json = message.get("body")
        if body_json is None:
            raise Exception("No body provided")

        logger.info(f"Received job: {body_json}")

        body = Body.model_validate_json(body_json)

        result = await agent.run(conf, body.url)

        webhook_sender_client = WebhookSender(conf["lambda_webhook_url"], body.job_id)

        logger.info(f"Sending result {result} to webhook for job {body.job_id}")
        webhook_sender_client.send_success(result.model_dump_json())
        logger.info(
            f"Successfully sent result {result} to webhook for job {body.job_id} ; exiting lambda"
        )
    except ValidationError as ve:
        raise Exception(ve.json())
    except Exception as e:
        raise e
