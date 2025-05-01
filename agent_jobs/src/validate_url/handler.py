import asyncio

from aws_lambda_typing import events, context as LambdaContext, responses
from pydantic import ValidationError

from src.errors.errors import ErrInternalServerError, ErrInvalidRequest
from src.validate_url.dto import Body
from src.validate_url import agent, config


def lambda_handler(
    event: events.APIGatewayProxyEventV2, 
    context: LambdaContext.Context,
) -> responses.APIGatewayProxyResponseV2:
  return asyncio.run(validate_url(event, context))
  
async def validate_url(
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
    conf = config.get()
    
    try:
        body_json = event.get("body")
        if body_json is None:
          return ErrInvalidRequest("No body provided")
        
        body = Body.model_validate_json(body_json)
        result = await agent.run(conf, body.url)
        
        return {
            "statusCode": 200,
            "body": result.model_dump_json(),
        }
    except ValidationError as ve:      
      return ErrInvalidRequest(ve.json())
    except Exception as e:
      return ErrInternalServerError(str(e))