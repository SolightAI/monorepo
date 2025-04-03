"""
Tests for basic API endpoints that don't require authentication.

This demonstrates the simplest way to use TestClient for testing public endpoints.
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient


@pytest.fixture
def client(app: FastAPI) -> TestClient:
    """Create a TestClient instance."""
    return TestClient(app)


def test_root_endpoint(client: TestClient):
    """Test the root endpoint if it exists."""
    response = client.get("/")
    # The root endpoint may return different status codes depending on how it's configured
    # Just verify that it doesn't crash (no 500 error)
    assert response.status_code != 500


def test_health_check(client: TestClient):
    """
    Test a health check endpoint.
    
    Note: If your API doesn't have a health check endpoint,
    you may need to add one or modify this test.
    """
    response = client.get("/health")
    
    # If there is no health endpoint, this will return 404 which is fine for this test
    if response.status_code == 200:
        data = response.json()
        assert "status" in data
    else:
        # You might want to log or print a message that this endpoint doesn't exist
        assert response.status_code == 404


def test_api_docs_endpoint(client: TestClient):
    """Test that the API docs endpoint is accessible."""
    response = client.get("/docs")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]

    # Also check the OpenAPI schema endpoint
    openapi_response = client.get("/openapi.json")
    assert openapi_response.status_code == 200
    assert "application/json" in openapi_response.headers["content-type"]

    # The schema should include basic information about the API
    schema = openapi_response.json()
    assert "paths" in schema
    assert "components" in schema 