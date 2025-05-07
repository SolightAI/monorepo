 # AWS Agent Job Pulumi Deployment

 ## Resources

 - A AWS ECR repository is created to store the agent jobs Docker images.
 - A AWS SQS queue is created to trigger the agent lambdas.
 - A AWS Lambda function is created to trigger the agent lambdas.