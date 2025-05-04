#!/bin/bash

docker build -f Dockerfile -t agent_job:unit-test .

if [ -z "$OPENAI_API_KEY" ]; then
  echo "OPENAI_API_KEY environment variable not set"
  exit 1
fi

docker run \
  --rm \
  --entrypoint pytest \
  -v ./src/tests:/var/task/src/tests \
  -v ./pytest.ini:/var/task/pytest.ini \
  -e OPENAI_API_KEY=${OPENAI_API_KEY} \
  -e HEADLESS=true \
  agent_job:unit-test