import logging

from fastapi import FastAPI

from src.config import config
from src.redis_store import client as redis

from src.lambda_webhook import router as lambda_webhook_router

logging.basicConfig(level=logging.INFO)

configuration = config.get()
redis.init(configuration)

app = FastAPI()


app.include_router(lambda_webhook_router)
