"""An AWS Python Pulumi program"""
import os
import pulumi
from pulumi_aws import sqs, iam, lambda_
from pulumi_awsx import ecr

config = pulumi.Config()

preview = os.getenv("PREVIEW")

pr_number = os.getenv("CURRENT_PR_NUMBER")
if not pr_number and preview:
  raise ValueError("CURRENT_PR_NUMBER environment variable not set but preview is set")

openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
  raise ValueError("OPENAI_API_KEY environment variable not set")

lambda_webhook_url = os.getenv("LAMBDA_WEBHOOK_URL")

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
  _format_rss_name("lambda-ecr-repo"),
  force_delete=True,
  tags=_tags()
)

# Build and push Docker image.
lambda_docker_image = ecr.Image(
  _format_rss_name("agent-lambda-image"),
  context="../",
  platform="linux/amd64",
  repository_url=lambda_ecr_repo.url
)

# Create the SQS queue.
agent_trigger_sqs_queue = sqs.Queue(
  _format_rss_name("agent-trigger-queue"),
  name=_format_rss_name("agent-trigger-queue"),
  visibility_timeout_seconds=1 * 60 * 60, # 1 hour
  message_retention_seconds=1 * 60 * 60 * 6, # 6 hours
  sqs_managed_sse_enabled=True,
  tags=_tags()
)

# Create the Lambda execution role.
agent_lambda_execution_role = iam.Role(
  _format_rss_name("agent-lambda-execution-role"),
  assume_role_policy=iam.get_policy_document(
        statements=[iam.GetPolicyDocumentStatementArgs(
            actions=["sts:AssumeRole"],
            principals=[iam.GetPolicyDocumentStatementPrincipalArgs(
                type="Service",
                identifiers=["lambda.amazonaws.com"],
            )],
        )]
    ).json
)

# Attach the basic AWS Lambda execution policy to the lambda execution role.
iam.RolePolicyAttachment(
    "lambda-exec-policy",
    role=agent_lambda_execution_role.name,
    policy_arn="arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
)

# Attach the basic AWS SQS Lambda execution policy to the lambda execution role.
iam.RolePolicyAttachment(
    "lambda-sqs-policy",
    role=agent_lambda_execution_role.name,
    policy_arn="arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole"
)

# Create the AWS lambda function for validate URL job.
agent_lambda_validate_url_function = lambda_.Function(
  _format_rss_name("agent-lambda-function-validate-url"),
  name=_format_rss_name("agent-lambda-function-validate-url"),
  package_type="Image",
  image_uri=lambda_docker_image.image_uri,
  role=agent_lambda_execution_role.arn,
  timeout=1 * 60 * 15, # 15 minutes
  memory_size=2048,
  image_config={
    "commands": ["src.validate_url.handler.lambda_handler"],
  },
  environment=lambda_.FunctionEnvironmentArgs(
    variables={
      "HEADLESS": "true",
      "OPENAI_API_KEY": openai_api_key,
      "LAMBDA_WEBHOOK_URL": _format_lambda_webhook_url(),
      "MEM0_DIR": "/tmp/mem0",
    }
  ),
  architectures=["x86_64"],
  tags=_tags()
)

# Link SQS to Lambda
event_mapping = lambda_.EventSourceMapping(
    "sqs-trigger",
    event_source_arn=agent_trigger_sqs_queue.arn,
    function_name=agent_lambda_validate_url_function.name,
    batch_size=1,
)

pulumi.export('lambda_ecr_repo', lambda_ecr_repo.url)
pulumi.export('lambda_docker_image', lambda_docker_image.image_uri)
pulumi.export('agent_trigger_sqs_queue', agent_trigger_sqs_queue.arn)
pulumi.export('agent_lambda_validate_url_function', agent_lambda_validate_url_function.name)