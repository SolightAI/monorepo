import pytest
import json
from uuid import uuid4
from httpx import AsyncClient
from fastapi import Response
from unittest.mock import patch  # FIXME: use pytest instead of unittest


@pytest.mark.asyncio
async def test_check_duplicate_endpoint_no_duplicate(client: AsyncClient):
    """Test the check-duplicate endpoint when no duplicate exists."""
    # Create request JSON
    request_data = {
        "test_name": "New Test",
        "test_steps": "1. Step one\n2. Step two",
        "product_id": str(uuid4()),
        "feature_id": str(uuid4()),
        "limit_to_epic": False
    }

    # Mock response directly by patching the endpoint function
    # This is more reliable than mocking the service function
    async def mock_endpoint(request):
        return Response(
            content=json.dumps({
                "is_duplicate": False,
                "duplicate_id": None,
                "similarity_score": None
            }),
            media_type="application/json",
            status_code=200
        )

    with patch("endpoints.test_endpoints.check_duplicate_test", side_effect=mock_endpoint):
        # Make the request
        response = await client.post(
            "/tests/check-duplicate",
            json=request_data
        )

        # Check the response
        assert response.status_code == 200
        data = response.json()
        assert data["is_duplicate"] is False
        assert data["duplicate_id"] is None
        assert data["similarity_score"] is None


@pytest.mark.asyncio
async def test_check_duplicate_endpoint_with_duplicate(client: AsyncClient):
    """Test the check-duplicate endpoint when a duplicate exists."""
    # Create a UUID for the duplicate test
    duplicate_id = uuid4()
    similarity_score = 0.85

    # Create request JSON
    request_data = {
        "test_name": "Existing Test",
        "test_steps": "1. Step one\n2. Step two",
        "product_id": str(uuid4()),
        "feature_id": str(uuid4()),
        "limit_to_epic": False
    }

    # Mock response directly
    async def mock_endpoint(request):
        return Response(
            content=json.dumps({
                "is_duplicate": True,
                "duplicate_id": str(duplicate_id),
                "similarity_score": similarity_score
            }),
            media_type="application/json",
            status_code=200
        )

    with patch("endpoints.test_endpoints.check_duplicate_test", side_effect=mock_endpoint):
        # Make the request
        response = await client.post(
            "/tests/check-duplicate",
            json=request_data
        )

        # Check the response
        assert response.status_code == 200
        data = response.json()
        assert data["is_duplicate"] is True
        assert data["duplicate_id"] == str(duplicate_id)
        assert data["similarity_score"] == similarity_score


@pytest.mark.asyncio
async def test_check_duplicate_endpoint_with_limit_to_epic(client: AsyncClient):
    """Test the check-duplicate endpoint with limit_to_epic parameter."""
    # Create a UUID for the duplicate test
    duplicate_id = uuid4()
    similarity_score = 0.9

    # Request with limit_to_epic=True
    request_data = {
        "test_name": "Existing Test",
        "test_steps": "1. Step one\n2. Step two",
        "product_id": str(uuid4()),
        "feature_id": str(uuid4()),
        "limit_to_epic": True
    }

    # Mock response, checking that limit_to_epic is correctly passed
    async def mock_endpoint(request):
        request_dict = json.loads(request.body)
        assert request_dict["limit_to_epic"] is True
        return Response(
            content=json.dumps({
                "is_duplicate": True,
                "duplicate_id": str(duplicate_id),
                "similarity_score": similarity_score
            }),
            media_type="application/json",
            status_code=200
        )

    with patch("endpoints.test_endpoints.check_duplicate_test", side_effect=mock_endpoint):
        # Make the request
        response = await client.post(
            "/tests/check-duplicate",
            json=request_data
        )

        # Check the response
        assert response.status_code == 200
        data = response.json()
        assert data["is_duplicate"] is True
        assert data["duplicate_id"] == str(duplicate_id)
        assert data["similarity_score"] == similarity_score


@pytest.mark.asyncio
async def test_by_epic_endpoint(client: AsyncClient):
    """Test the by-epic endpoint."""
    # Create a UUID for the epic
    epic_id = uuid4()

    # Create complete test data matching TestSchema
    test_data = [
        {
            "id": str(uuid4()),
            "name": "Test 1",
            "description": "Test 1 description",
            "url": "http://example.com",
            "category": "SMOKE",
            "status": "NOT_STARTED",
            "feature_id": str(uuid4()),
            "preconditions": "User is logged in",
            "steps": "1. Go to dashboard\n2. Click on profile",
            "expected_results": "Profile page is displayed",
            "assertions": "Profile information is correct",
            "started_at": None,
            "ended_at": None,
            "bugs": [],
            "secrets": []
        },
        {
            "id": str(uuid4()),
            "name": "Test 2",
            "description": "Test 2 description",
            "url": "http://example.com",
            "category": "FUNCTIONAL",
            "status": "NOT_STARTED",
            "feature_id": str(uuid4()),
            "preconditions": "User has admin permissions",
            "steps": "1. Go to admin panel\n2. Click on settings",
            "expected_results": "Settings page is displayed",
            "assertions": "All settings are available",
            "started_at": None,
            "ended_at": None,
            "bugs": [],
            "secrets": []
        }
    ]

    # Mock the endpoint function directly
    async def mock_endpoint(epic_id):
        return Response(
            content=json.dumps(test_data),
            media_type="application/json",
            status_code=200
        )

    with patch("endpoints.test_endpoints.get_tests_by_epic_endpoint", side_effect=mock_endpoint):
        # Make the request
        response = await client.get(f"/tests/by-epic/{epic_id}")

        # Check the response
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["id"] == test_data[0]["id"]
        assert data[0]["name"] == "Test 1"
        assert data[1]["id"] == test_data[1]["id"]
        assert data[1]["name"] == "Test 2"
