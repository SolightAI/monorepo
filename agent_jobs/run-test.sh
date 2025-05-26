#!/bin/bash

set -e

if [ -z "$RUN_ID" ]; then
  echo "RUN_ID environment variable not set, setting to local"
  RUN_ID=local
fi
 
if [ -z "$OPENAI_API_KEY" ]; then
  echo "OPENAI_API_KEY environment variable not set"
  exit 1
fi

UNIT_TEST_NETWORK_NAME=solight_agent_job_test_shared_network-$RUN_ID

# Create the shared network if it doesn't exist yet
if ! docker network inspect $UNIT_TEST_NETWORK_NAME &>/dev/null; then
  echo "Creating shared network: $UNIT_TEST_NETWORK_NAME &>/dev/null; then"
  docker network create $UNIT_TEST_NETWORK_NAME
else
  echo "Shared network $UNIT_TEST_NETWORK_NAME already exists"
fi

if [ -z $IMAGE_NAME ]; then
  IMAGE_NAME=agent-job-test:$RUN_ID
  echo "Using default image name: $IMAGE_NAME"
fi

docker build -f Dockerfile -t $IMAGE_NAME .

# Run redis container
docker run \
  --name agent-job-test-redis-$RUN_ID \
  --network $UNIT_TEST_NETWORK_NAME \
  -d \
  -p 6379 \
  redis:7-alpine

# Run Minio container
docker run \
  --name agent-job-test-minio-$RUN_ID \
  --network $UNIT_TEST_NETWORK_NAME \
  -d \
  -p 9000 \
  -e MINIO_ROOT_USER=minio \
  -e MINIO_ROOT_PASSWORD=minio123 \
  minio/minio server /data #--console-address ":9001"

# Build & run playground
docker build -f tests/playground/Dockerfile -t playground:test tests/playground

docker run \
  --rm \
  --name agent-job-test-playground-$RUN_ID \
  --network $UNIT_TEST_NETWORK_NAME \
  -p 3000 \
  -d \
  playground:test


## Define the cleanup function
cleanup() {
  echo "Cleaning up resources..."
  # Cleanup tests resources
  docker rm -f agent-job-test-redis-$RUN_ID || true
  docker rm -f agent-job-test-minio-$RUN_ID || true
  docker rm -f agent-job-test-playground-$RUN_ID || true
  docker network rm $UNIT_TEST_NETWORK_NAME || true
}

## Register the cleanup function to be executed on script interruption
trap cleanup EXIT SIGINT SIGTERM

# Run test in container
# Base docker run command
CMD=(
  docker run
  --rm
  --network "$UNIT_TEST_NETWORK_NAME"
  --entrypoint pytest
  -v ./tests:/var/task/tests
  -v ./pytest.ini:/var/task/pytest.ini
  -e OPENAI_API_KEY="$OPENAI_API_KEY"
  -e HEADLESS=true
  -e REDIS_HOST=agent-job-test-redis-$RUN_ID
  -e REDIS_PORT=6379
  -e S3_ACCESS_KEY_ID=minio
  -e S3_SECRET_ACCESS_KEY=minio123
  -e S3_ENDPOINT_URL=http://agent-job-test-minio-$RUN_ID:9000
  -e PLAYGROUND_URL=http://agent-job-test-playground-$RUN_ID:3000
)

# List of environment variable names to conditionally include if they exist
ADDITIONAL_TEST_ENV_VARS=(
  FARMZZ_USERNAME
  FARMZZ_PASSWORD
  TECLA_ACADEMY_USERNAME
  TECLA_ACADEMY_PASSWORD
  SESAME_HR_USERNAME
  SESAME_HR_PASSWORD
  MEANDWHO_USERNAME
  MEANDWHO_PASSWORD
  SOLIGHT_USERNAME
  SOLIGHT_PASSWORD
  SOLIGHT_RECOVERY_PHONE_NUMBER
  TICKPICK_USERNAME
  TICKPICK_PASSWORD
  TWOCAPTCHA_API_KEY
  PROD_S3_ACCESS_KEY_ID
  PROD_S3_SECRET_ACCESS_KEY
  PROD_S3_REGION_NAME
  PROD_S3_ENDPOINT_URL
  PROD_S3_BUCKET_NAME
)

# Loop through and append defined ones to CMD
for var_name in "${ADDITIONAL_TEST_ENV_VARS[@]}"; do
  value="${!var_name}"
  if [[ -n "$value" ]]; then
    CMD+=(-e "$var_name=$value")
  fi
done
# Add the image and arguments
CMD+=("$IMAGE_NAME" -n 6)

# Add positional arguments from the CLI
# - Run a specific test `./run-test.sh tests/jobs/test_job_parser.py``
# - Make it verboke `./run-test.sh -v`
# - Both `./run-test.sh -v tests/jobs/test_job_parser.py`
# ...
CMD+=($@)

# Execute the command
"${CMD[@]}"