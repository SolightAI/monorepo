#!/bin/bash

UNIT_TEST_NETWORK_NAME=solight_lambda_webhook_test_shared_network

# Create the shared network if it doesn't exist yet
if ! docker network inspect $UNIT_TEST_NETWORK_NAME &>/dev/null; then
  echo "Creating shared network: $UNIT_TEST_NETWORK_NAME &>/dev/null; then"
  docker network create $UNIT_TEST_NETWORK_NAME
else
  echo "Shared network $UNIT_TEST_NETWORK_NAME already exists"
fi

if [ -z $IMAGE_NAME ]; then
  IMAGE_NAME=lambda-webhook-test:local
  echo "Using default image name: $IMAGE_NAME"
fi


# Run redis container
docker run \
  --name lambda_webhook_test_redis \
  --network $UNIT_TEST_NETWORK_NAME \
  -d \
  -p 19203:6379 \
  redis:7-alpine

docker build -f Dockerfile -t $IMAGE_NAME .

# Run tests
docker run \
  --rm \
  --entrypoint pytest \
  --network $UNIT_TEST_NETWORK_NAME \
  -v ./tests:/app/tests \
  -e REDIS_HOST=lambda_webhook_test_redis \
  -e REDIS_PORT=6379 \
  -e REDIS_DB=0 \
  -e REDIS_PASSWORD="" \
  $IMAGE_NAME .

# Cleanup tests resources
docker rm -f lambda_webhook_test_redis
docker network rm $UNIT_TEST_NETWORK_NAME