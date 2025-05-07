from fastapi.testclient import TestClient
import json
import pytest_asyncio

from src.redis_store.job import build_job_key, Job
from src.redis_store import client as redis
from src.config import config
from src.main import app
from src.redis_store.client import init


@pytest_asyncio.fixture(scope="session", autouse=True)
async def init_test_environment():
    configuration = config.get()
    init(config=configuration)


@pytest_asyncio.fixture(scope="function")
async def webhook_client():
    return TestClient(app)


def insert_job(job_id: str, status: str):
    job_key = build_job_key(job_id)
    redis.redis().set(job_key, json.dumps({"status": status}))


def verify_key(job_id: str, status: str, result: str):
    job_key = build_job_key(job_id)
    job = redis.redis().get(job_key, Job)

    assert job is not None
    assert job.status == status
    assert job.result == result
