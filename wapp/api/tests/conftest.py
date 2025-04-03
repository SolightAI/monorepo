import os
import pytest
import asyncio
import sys
from httpx import AsyncClient, ASGITransport
from asyncio import AbstractEventLoop
from fastapi import FastAPI
from tortoise import Tortoise
from tortoise.contrib.test import finalizer, initializer
from dotenv import load_dotenv
from fastapi.testclient import TestClient

# Load test environment variables
test_env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.test')
load_dotenv(test_env_path)

# Add project root to Python path to enable proper imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))
from main import app

# Test database configuration
TEST_DB = {
    "connections": {
        "default": {
            "engine": "tortoise.backends.sqlite",
            "credentials": {"file_path": ":memory:"},
        }
    },
    "apps": {
        "models": {
            "models": ["src.dto.models"],
            "default_connection": "default",
        }
    }
}


async def init_db(db_url, create_db: bool = False, schemas: bool = False) -> None:
    """Initial database connection"""
    await Tortoise.init(
        db_url=db_url, modules={"models": ["dto.models"]}, _create_db=create_db
    )
    if create_db:
        print(f"Database created! {db_url = }")
    if schemas:
        await Tortoise.generate_schemas()
        print("Success to generate schemas")


async def init(db_url: str = "sqlite://:memory:"):
    await init_db(db_url, True, True)


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="function")
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        print("Client is ready")
        yield client


@pytest.fixture(scope="function", autouse=True)
async def initialize_tests():
    await init()
    yield
    await Tortoise._drop_databases()