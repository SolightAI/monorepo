"""An AWS Python Pulumi program"""

import os
import pulumi

from typing import Any

from pulumi_aws import sqs, iam, lambda_
from pulumi_awsx import ecr

config = pulumi.Config()

preview = os.getenv("PREVIEW")

pr_number = os.getenv("CURRENT_PR_NUMBER")
if not pr_number and preview:
    raise ValueError(
        "CURRENT_PR_NUMBER environment variable not set but preview is set"
    )

openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("OPENAI_API_KEY environment variable not set")

lambda_webhook_url = os.getenv("LAMBDA_WEBHOOK_URL")

s3_access_key_id = os.getenv("S3_ACCESS_KEY_ID")
s3_secret_access_key = os.getenv("S3_SECRET_ACCESS_KEY")
s3_bucket_name = os.getenv("S3_BUCKET_NAME")
s3_bucket_endpoint_url = os.getenv("S3_BUCKET_ENDPOINT_URL")
s3_region = os.getenv("S3_REGION") or "us-west-1"

if (
    not s3_access_key_id
    or not s3_secret_access_key
    or not s3_bucket_name
    or not s3_bucket_endpoint_url
):
    raise ValueError(
        "S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, or S3_BUCKET_NAME environment variable not set"
    )

redis_host = os.getenv("REDIS_HOST")
redis_port = os.getenv("REDIS_PORT")
redis_db = os.getenv("REDIS_DB")
redis_password = os.getenv("REDIS_PASSWORD")

if not redis_host or not redis_port or not redis_db:
    raise ValueError(
        "REDIS_HOST, REDIS_PORT, REDIS_DB, or REDIS_PASSWORD environment variable not set"
    )

symmetric_encryption_key = os.getenv("SYMMETRIC_ENCRYPTION_KEY")
if not symmetric_encryption_key:
    raise ValueError("SYMMETRIC_ENCRYPTION_KEY environment variable not set")

two_captcha_api_key = os.getenv("TWOCAPTCHA_API_KEY")
if not two_captcha_api_key:
    raise ValueError("TWOCAPTCHA_API_KEY environment variable not set")

laminar_api_key = os.getenv("LAMINAR_API_KEY")


def _format_rss_name(name):
    if preview and pr_number:
        return f"{name}-{pr_number}"
    return name


def _tags():
    if preview and pr_number:
        return {
            "pr": pr_number,
            "stage": "prevew",
        }

    return {
        "stage": "production",
    }


def _format_lambda_webhook_url():
    # Manually set webhook URL
    if lambda_webhook_url:
        return lambda_webhook_url

    # Preview URL
    if preview and pr_number:
        return "https://preview.agent-webhook.solight.ai/lambda-webhook"

    # Production URL
    return "https://agent-webhook.solight.ai/lambda-webhook"


# Create ECR Repository.
lambda_ecr_repo = ecr.Repository(
    _format_rss_name("lambda-ecr-repo"), force_delete=True, tags=_tags()
)

# Build and push Docker image.
lambda_docker_image = ecr.Image(
    _format_rss_name("agent-lambda-image"),
    context="../",
    platform="linux/amd64",
    repository_url=lambda_ecr_repo.url,
)

# Create the SQS queue.
agent_trigger_sqs_queue = sqs.Queue(
    _format_rss_name("agent-trigger-queue"),
    name=_format_rss_name("agent-trigger-queue"),
    visibility_timeout_seconds=1 * 60 * 60,  # 1 hour
    message_retention_seconds=1 * 60 * 60 * 6,  # 6 hours
    sqs_managed_sse_enabled=True,
    tags=_tags(),
)

# Create the Lambda execution role.
agent_lambda_execution_role = iam.Role(
    _format_rss_name("agent-lambda-execution-role"),
    assume_role_policy=iam.get_policy_document(
        statements=[
            iam.GetPolicyDocumentStatementArgs(
                actions=["sts:AssumeRole"],
                principals=[
                    iam.GetPolicyDocumentStatementPrincipalArgs(
                        type="Service",
                        identifiers=["lambda.amazonaws.com"],
                    )
                ],
            )
        ]
    ).json,
)

# Attach the basic AWS Lambda execution policy to the lambda execution role.
iam.RolePolicyAttachment(
    "lambda-exec-policy",
    role=agent_lambda_execution_role.name,
    policy_arn="arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
)

# Attach the basic AWS SQS Lambda execution policy to the lambda execution role.
iam.RolePolicyAttachment(
    "lambda-sqs-policy",
    role=agent_lambda_execution_role.name,
    policy_arn="arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole",
)


def _build_lambda_environment_variables() -> Any:
    vars = {
        "HEADLESS": "true",
        "OPENAI_API_KEY": openai_api_key,
        "WEBHOOK_URL": _format_lambda_webhook_url(),
        "S3_ACCESS_KEY_ID": s3_access_key_id,
        "S3_SECRET_ACCESS_KEY": s3_secret_access_key,
        "S3_BUCKET_NAME": s3_bucket_name,
        "S3_BUCKET_ENDPOINT_URL": s3_bucket_endpoint_url,
        "S3_REGION": s3_region,
        "REDIS_HOST": redis_host,
        "REDIS_PORT": redis_port,
        "REDIS_DB": redis_db,
        "SYMMETRIC_ENCRYPTION_KEY": symmetric_encryption_key,
        "TWOCAPTCHA_API_KEY": two_captcha_api_key,
        "MEM0_DIR": "/tmp/mem0",
    }

    if redis_password is not None:
        vars["REDIS_PASSWORD"] = redis_password

    if laminar_api_key is not None:
        vars["LAMINAR_API_KEY"] = laminar_api_key

    return vars


# Create the AWS lambda function for validate URL job.
agent_lambda_function = lambda_.Function(
    _format_rss_name("agent-lambda-function"),
    name=_format_rss_name("agent-lambda-function"),
    package_type="Image",
    image_uri=lambda_docker_image.image_uri,
    role=agent_lambda_execution_role.arn,
    timeout=1 * 60 * 15,  # 15 minutes
    memory_size=2048,
    image_config={
        "commands": ["src.main.lambda_handler"],
    },
    environment=lambda_.FunctionEnvironmentArgs(
        variables=_build_lambda_environment_variables()
    ),
    architectures=["x86_64"],
    tags=_tags(),
)

# Link SQS to Lambda
event_mapping = lambda_.EventSourceMapping(
    "sqs-trigger",
    event_source_arn=agent_trigger_sqs_queue.arn,
    function_name=agent_lambda_function.name,
    batch_size=1,
)

pulumi.export("lambda_ecr_repo", lambda_ecr_repo.url)
pulumi.export("lambda_docker_image", lambda_docker_image.image_uri)
pulumi.export("agent_trigger_sqs_queue", agent_trigger_sqs_queue.arn)
pulumi.export("agent_lambda_function", agent_lambda_function.name)
