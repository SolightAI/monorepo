import os
import pytest
import asyncio
import sys
from typing import AsyncGenerator, Dict, Any, Generator
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
            "models": ["src.dto.models"],
            "default_connection": "default",
        }
    }
}

@pytest.fixture(scope="session")
def initialize_tests() -> None:
    """Initialize test database before tests."""
    initializer(TEST_DB["apps"]["models"]["models"], db_url="sqlite://:memory:")
    yield None
    finalizer()


@pytest.fixture
def app(initialize_tests: None) -> FastAPI:
    """Get the FastAPI app for testing."""
    return main_app


@pytest.fixture
def client(app: FastAPI) -> TestClient:
    """Get a synchronous TestClient for testing the API."""
    return TestClient(app)


@pytest.fixture
def test_user() -> Dict[str, Any]:
    """Test user for authentication tests."""
    return {
        "email": "test@example.com",
        "password": "TestPassword123",
        "full_name": "Test User"
    }


@pytest.fixture
def auth_headers(client: TestClient, test_user: Dict[str, Any]) -> Dict[str, str]:
    """Get authentication headers for a test user."""
    # This is a placeholder - implement actual registration and login once auth endpoints are ready
    client.post("/auth/register", json=test_user)
    login_response = client.post("/auth/login", data={
        "username": test_user["email"],
        "password": test_user["password"]
    })
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
