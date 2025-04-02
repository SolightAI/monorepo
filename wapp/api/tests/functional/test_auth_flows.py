import pytest
from httpx import AsyncClient
from http import HTTPStatus

from ..factories.user import UserFactory


@pytest.mark.functional
@pytest.mark.auth
class TestAuthFlows:
    """Test authentication flows."""

    async def test_register_success(self, client: AsyncClient):
        """Test successful user registration."""
        user_data = UserFactory.regular()
        response = await client.post("/auth/register", json=user_data)

        assert response.status_code == HTTPStatus.CREATED
        assert "user_id" in response.json()
        assert "email" in response.json()
        assert response.json()["email"] == user_data["email"]

    async def test_register_duplicate_email(self, client: AsyncClient):
        """Test registration with duplicate email."""
        user_data = UserFactory.regular()

        # First registration should succeed
        await client.post("/auth/register", json=user_data)

        # Second registration with same email should fail
        response = await client.post("/auth/register", json=user_data)
        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "already exists" in response.json()["detail"].lower()

    async def test_login_success(self, client: AsyncClient):
        """Test successful login."""
        user_data = UserFactory.regular()

        # Register user first
        await client.post("/auth/register", json=user_data)

        # Login
        login_data = {
            "username": user_data["email"],
            "password": user_data["password"]
        }
        response = await client.post("/auth/login", data=login_data)

        assert response.status_code == HTTPStatus.OK
        assert "access_token" in response.json()
        assert "token_type" in response.json()
        assert response.json()["token_type"] == "bearer"

    async def test_login_invalid_credentials(self, client: AsyncClient):
        """Test login with invalid credentials."""
        user_data = UserFactory.regular()

        # Register user first
        await client.post("/auth/register", json=user_data)

        # Login with wrong password
        login_data = {
            "username": user_data["email"],
            "password": "wrong_password"
        }
        response = await client.post("/auth/login", data=login_data)

        assert response.status_code == HTTPStatus.UNAUTHORIZED
        assert "invalid" in response.json()["detail"].lower()

    async def test_get_current_user(self, client: AsyncClient):
        """Test retrieving current user profile."""
        user_data = UserFactory.regular()

        # Register user
        await client.post("/auth/register", json=user_data)

        # Login
        login_data = {
            "username": user_data["email"],
            "password": user_data["password"]
        }
        login_response = await client.post("/auth/login", data=login_data)
        token = login_response.json()["access_token"]

        # Get user profile
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get("/auth/me", headers=headers)

        assert response.status_code == HTTPStatus.OK
        assert response.json()["email"] == user_data["email"]
        assert response.json()["full_name"] == user_data["full_name"]

    async def test_unauthorized_access(self, client: AsyncClient):
        """Test accessing protected endpoint without authentication."""
        response = await client.get("/auth/me")

        assert response.status_code == HTTPStatus.UNAUTHORIZED
        assert "not authenticated" in response.json()["detail"].lower()

    async def test_logout(self, client: AsyncClient):
        """Test user logout."""
        user_data = UserFactory.regular()

        # Register user
        await client.post("/auth/register", json=user_data)

        # Login
        login_data = {
            "username": user_data["email"],
            "password": user_data["password"]
        }
        login_response = await client.post("/auth/login", data=login_data)
        token = login_response.json()["access_token"]

        # Logout
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.post("/auth/logout", headers=headers)

        assert response.status_code == HTTPStatus.OK
        assert "logged out" in response.json()["detail"].lower()

        # Try accessing protected endpoint after logout
        response = await client.get("/auth/me", headers=headers)
        assert response.status_code == HTTPStatus.UNAUTHORIZED
