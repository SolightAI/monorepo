import logging
import requests
import boto3

from enum import Enum
from typing import Literal, Union
from pydantic import BaseModel

from config.config import Config

from .dtos import (
    ValidateURLPayload,
    GenerateTestsPayload,
    RunTestPayload,
    ImproveTestStepsPayload,
)


logger = logging.getLogger(__name__)


class JobType(str, Enum):
    VALIDATE_URL = "validate_url"
    GENERATE_TESTS = "generate_tests"
    RUN_TEST = "run_test"
    IMPROVE_TEST_STEPS = "improve_test_steps"


class ValidateURLJob(BaseModel):
    job_type: Literal[JobType.VALIDATE_URL]
    job_id: str
    payload: ValidateURLPayload


class GenerateTestsJob(BaseModel):
    job_type: Literal[JobType.GENERATE_TESTS]
    job_id: str
    payload: GenerateTestsPayload


class RunTestJob(BaseModel):
    job_type: Literal[JobType.RUN_TEST]
    job_id: str
    payload: RunTestPayload


class ImproveTestStepsJob(BaseModel):
    job_type: Literal[JobType.IMPROVE_TEST_STEPS]
    job_id: str
    payload: ImproveTestStepsPayload


Job = Union[ValidateURLJob, GenerateTestsJob, RunTestJob, ImproveTestStepsJob]


async def trigger_lambda(config: Config, job: Job) -> None:
    # Comment this block and expose the webhook with ngrok to test locally the complete
    # flow by calling the SQS lambda.
    if config.dev_mode is True:
        # When we send a request to the dev endpoint, we need to wrap the payload
        # in a field body.
        payload = {"Records": [{"body": job.model_dump_json()}]}

        logger.info(
            f"Sending request {payload} to {config.test_aws_lambda_validate_url_endpoint}"
        )

        requests.post(
            config.test_aws_lambda_validate_url_endpoint or "",
            json=payload,
        )

        return

    # Trigger through SQS topic
    sqs = boto3.client(
        "sqs",
        # Force endpoint URL since we have already AWS_ENDPOINT_URL configured for minio that mess up boto config
        endpoint_url="https://sqs.us-west-1.amazonaws.com",
        aws_access_key_id=config.prod_aws_lambda_queue_trigger_access_key,
        aws_secret_access_key=config.prod_aws_lambda_queue_trigger_secret_key,
        region_name="us-west-1",
    )

    queue_url = config.prod_aws_lambda_queue_url
    if not queue_url:
        raise ValueError("No queue URL provided")

    logger.info(f"Sending payload: {job=} to SQS queue: {queue_url}")

    sqs.send_message(QueueUrl=queue_url, MessageBody=job.model_dump_json())

    logger.info("Successfully sent message to SQS queue")
