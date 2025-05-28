# Agent Jobs

This directory contains the source code for the agent jobs that runs through AWS Lambda.

## Deployment

There's a [Pulumi Github Action](../.github/workflows/lambda-deployment.yaml) that will use the [deployment](./deployment/) directory to deploy the agent jobs to AWS.

To deploy a preview that will work with your [local ./start-all.sh script](../start-all.sh) , you can follow these steps:


```shell
# Make sure your have the Pulumi CLI installed
pulumi login # Ask for your Pulumi access token

# Run ngrok on the lambda_webhook service so the lambda can ping it
ngrok http http://localhost:<lambda_webhook_port>

# Setup a .envrc with your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY that pulumi can use to deploy.
# You will also need to provide the env variables to forward to the lambda
# described in deploy.sh line 5.

PREVIEW=1 CURRENT_PR_NUMBER=xxx ./deploy.sh
```

## Run Tests

To run the tests, you can use the following command:

```bash
OPENAI_API_KEY=<your_openai_api_key> ./run-test.sh
```

This will execute the tests using pytest for each agents.

## Run locally (on host)

To run the agent job locally so it can run headful, you can follow the steps:

1. Start the compose

```shell
TEST_AWS_LAMBDA_URL=http://host.docker.internal:8000 ./start-all.sh local-lambda
```

4. Start the service locally from the CLI (make sure the environment variable match)

```shell
WEBHOOK_URL=http://localhost:8085/lambda-webhook HEADLESS=false S3_ACCESS_KEY_ID=minioadmin S3_SECRET_ACCESS_KEY=minioadmin S3_BUCKET_NAME=task-manager S3_BUCKET_ENDPOINT_URL=http://localhost:9000 REDIS_HOST=localhost REDIS_PORT=6379 REDIS_DB=0 TWOCAPTCHA_API_KEY="x" SYMMETRIC_ENCRYPTION_KEY=S5ox-_h4p9NISVvQFPsAE5T-8K-SNp67GLQalO75rDI= fastapi dev src/api_main.py
```

## Run locally (on docker)

1. Start the compose

```shell
./start-all.sh
```