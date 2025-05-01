import json

from aws_lambda_typing import responses

HTTP_STATUS_BAD_REQUEST = 400
HTTP_STATUS_INTERNAL_SERVER_ERROR = 500


def ErrInvalidRequest(message: str) -> responses.APIGatewayProxyResponseV2:
  return {
    "statusCode": HTTP_STATUS_BAD_REQUEST,
    "body": json.dumps({
      "message": message,
    }),
  }

def ErrInternalServerError(message: str) -> responses.APIGatewayProxyResponseV2:
  return {
    "statusCode": HTTP_STATUS_INTERNAL_SERVER_ERROR,
    "body": json.dumps({
      "message": message,
    }),
  }

