#/bin/bash

# This script is used to deploy the agent_job lambda to AWS

REQUIRED_ENV_VARS=(
  OPENAI_API_KEY
  S3_ACCESS_KEY_ID
  S3_SECRET_ACCESS_KEY
  S3_BUCKET_NAME
  S3_BUCKET_ENDPOINT_URL
  REDIS_HOST
  REDIS_PORT
  REDIS_DB
  SYMMETRIC_ENCRYPTION_KEY
  TWOCAPTCHA_API_KEY
)

OPTIONAL_ENV_VARS=(
  LAMBDA_WEBHOOK_URL
  PREVIEW
  CURRENT_PR_NUMBER
)


if [ -z "$PREVIEW" ]; then
  echo "Deploying to production environment, waiting 3 before deploying..."
  sleep 3

  pulumi stack select solight_ai/prod
else
  if [ -z "$CURRENT_PR_NUMBER" ]; then
    echo "CURRENT_PR_NUMBER environment variable not set but preview is set"
    exit 1
  fi

  echo "Deploying to preview environment, waiting 3 before deploying..."
  sleep 3

  pulumi stack select solight_ai/preview
fi

for var in "${REQUIRED_ENV_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "Required environment variable $var not set"
    exit 1
  fi

  export "$var=${!var}"
done

for var in "${OPTIONAL_ENV_VARS[@]}"; do
  if [ -n "${!var}" ]; then
    export "$var=${!var}"
  fi
done

if [ -n "${DRY_RUN}" ]; then
  echo "Dry run, running preview"

  pulumi preview

  exit 0
fi

echo "Starting deployment..."

pulumi up