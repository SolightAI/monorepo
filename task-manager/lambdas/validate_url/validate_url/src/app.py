import json
import asyncio

from pydantic import ValidationError
from aws_lambda_typing import events, context as LambdaContext, responses

from .agent import run_agent
from .dto import Body
from .config import get_config


errMissingBody = {
    "statusCode": 400,
    "body": json.dumps({
        "message": "No body provided",
    }),
}

def lambda_handler(
    event: events.APIGatewayProxyEventV2, 
    context: LambdaContext.Context,
) -> responses.APIGatewayProxyResponseV2:
    return asyncio.run(validate_url_handler(event, context))

async def validate_url_handler(
    event: events.APIGatewayProxyEventV2, 
    context: LambdaContext.Context,
) -> responses.APIGatewayProxyResponseV2:
    """
    Validate URL by checking if a login page exists.

    Parameters
    ----------
    event: dict, required
        API Gateway Lambda Proxy Input Format

        Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
        
        body: dto.Body

    context: object, required
        Lambda Context runtime methods and attributes

        Context doc: https://docs.aws.amazon.com/lambda/latest/dg/python-context-object.html

    Returns
    ------
    API Gateway Lambda Proxy Output Format: dict

        Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
        
        body: dto.Result
    """
    config = get_config()
     
    try:
        body_json = event.get("body")
        print(body_json)
        if body_json is None:
            return {
                "statusCode": 400,
                "body": json.dumps({
                    "message": "No body provided",
                }),
            } 

        body = Body.model_validate_json(body_json)
        result = await run_agent(config, body.url)

        return {
            "statusCode": 200,
            "body": result.model_dump_json(),
        }
    except ValidationError as ve:
        return {
            "statusCode": 400,
            "body": json.dumps({
                "message": ve.errors(),
            }),
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({
                "message": str(e),
            }),
        }
