import os
import pytest
import asyncio
import sys
from typing import AsyncGenerator, Dict, Any, Generator
from asyncio import AbstractEventLoop
from fastapi import FastAPI
from httpx import AsyncClient
from tortoise import Tortoise
from tortoise.contrib.test import finalizer, initializer
from dotenv import load_dotenv

# Load test environment variables
test_env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.test')
load_dotenv(test_env_path)

# Add project root to Python path to enable proper imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

# Import your app
from src.main import app as main_app


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
            "models": ["src.models"],
            "default_connection": "default",
        }
    }
}


@pytest.fixture(scope="session")
def event_loop() -> Generator[AbstractEventLoop, None, None]:
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def initialize_tests() -> AsyncGenerator[None, None]:
    """Initialize test database before tests."""
    initializer(TEST_DB["apps"]["models"]["models"], db_url="sqlite://:memory:")
    await Tortoise.init(config=TEST_DB)
    await Tortoise.generate_schemas()
    yield
    await Tortoise.close_connections()
    finalizer()


@pytest.fixture
async def app(initialize_tests: None) -> FastAPI:
    """Get the FastAPI app for testing."""
    return main_app


@pytest.fixture
async def client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    """Get an async client for testing the API."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def test_user() -> Dict[str, Any]:
    """Test user for authentication tests."""
    return {
        "email": "test@example.com",
        "password": "TestPassword123",
        "full_name": "Test User"
    }


@pytest.fixture
async def auth_headers(client: AsyncClient, test_user: Dict[str, Any]) -> Dict[str, str]:
    """Get authentication headers for a test user."""
    # This is a placeholder - implement actual registration and login once auth endpoints are ready
    await client.post("/auth/register", json=test_user)
    login_response = await client.post("/auth/login", data={
        "username": test_user["email"],
        "password": test_user["password"]
    })
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
