"""Test utility functions."""
from typing import Dict, Any
from httpx import AsyncClient, Response


async def register_user(client: AsyncClient, user_data: Dict[str, Any]) -> Response:
    """Register a test user."""
    return await client.post("/auth/register", json=user_data)


async def login_user(client: AsyncClient, email: str, password: str) -> Response:
    """Login a test user."""
    login_data = {
        "username": email,
        "password": password
    }
    return await client.post("/auth/login", data=login_data)


async def get_auth_headers(client: AsyncClient, user_data: Dict[str, Any]) -> Dict[str, str]:
    """Get authentication headers for a test user."""
    # Register if needed
    await register_user(client, user_data)

    # Login
    login_response = await login_user(client, user_data["email"], user_data["password"])
    token = login_response.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}


async def create_test_organization(
    client: AsyncClient,
    auth_headers: Dict[str, str],
    org_data: Dict[str, Any]
) -> Dict[str, Any]:
    """Create a test organization."""
    response = await client.post("/organizations", json=org_data, headers=auth_headers)
    return response.json()
