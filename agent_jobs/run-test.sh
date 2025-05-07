#!/bin/bash

if [ -z "$OPENAI_API_KEY" ]; then
  echo "OPENAI_API_KEY environment variable not set"
  exit 1
fi

if [ -z $IMAGE_NAME ]; then
  IMAGE_NAME=agent_job:unit-test
  echo "Using default image name: $IMAGE_NAME"
fi

docker build -f Dockerfile -t $IMAGE_NAME .

docker run \
  --rm \
  --entrypoint pytest \
  -v ./tests:/var/task/tests \
  -v ./pytest.ini:/var/task/pytest.ini \
  -e OPENAI_API_KEY=${OPENAI_API_KEY} \
  -e HEADLESS=true \
  $IMAGE_NAME