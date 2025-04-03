import pytest
import jwt
import os
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient
from dto.models import User


# Fixtures
@pytest.fixture
async def regular_user():
    """Create a regular test user in the database"""
    user = await User.create(
        username="Regular User",
        email="regular@example.com",
        is_admin=False,
        onboarding_completed=True
    )
    yield user
    await user.delete()


@pytest.fixture
async def admin_user():
    """Create an admin test user in the database"""
    user = await User.create(
        username="Admin User",
        email="admin@laneo.io",  # Using the admin email domain
        is_admin=True,
        onboarding_completed=True
    )
    yield user
    await user.delete()


@pytest.fixture
async def new_user():
    """Create a new user who hasn't completed onboarding"""
    user = await User.create(
        username="New User",
        email="new@example.com",
        is_admin=False,
        onboarding_completed=False
    )
    yield user
    await user.delete()


def create_token(user_email, expires_delta=None, algorithm="HS256"):
    """Helper function to create JWT tokens"""
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "test_secret_key")
    
    to_encode = {"sub": user_email}
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
        to_encode.update({"exp": expire})
        
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=algorithm)


# Test cases
@pytest.mark.anyio
async def test_unauthenticated_access(client: AsyncClient):
    """Test that protected endpoints reject unauthenticated access"""
    # Test access to auth check endpoint
    response = await client.get("/auth/check-auth")
    assert response.status_code == 401
    
    # Test access to a protected endpoint
    response = await client.get("/auth/is-admin/")
    assert response.status_code == 401


@pytest.mark.anyio
async def test_regular_user_authentication(client: AsyncClient, regular_user):
    """Test regular user authentication flow"""
    # Generate a valid token
    token = create_token(regular_user.email)
    
    # Test authentication check
    headers = {"Cookie": f"access_token=Bearer {token}"}
    response = await client.get("/auth/check-auth", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is True
    assert data["user"]["email"] == regular_user.email
    assert data["user"]["username"] == regular_user.username
    assert data["user"]["is_admin"] is False
    assert data["user"]["onboarding_completed"] is True


@pytest.mark.anyio
async def test_admin_user_authentication(client: AsyncClient, admin_user):
    """Test admin user authentication flow"""
    # Generate a valid token
    token = create_token(admin_user.email)
    
    # Test authentication check
    headers = {"Cookie": f"access_token=Bearer {token}"}
    response = await client.get("/auth/check-auth", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is True
    assert data["user"]["email"] == admin_user.email
    assert data["user"]["is_admin"] is True
    
    # Test admin-specific endpoint
    response = await client.get("/auth/is-admin/", headers=headers)
    assert response.status_code == 200
    assert response.json()["is_admin"] is True


@pytest.mark.anyio
async def test_non_admin_restricted_access(client: AsyncClient, regular_user):
    """Test that non-admin users cannot access admin-only endpoints"""
    token = create_token(regular_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}
    
    # Attempt to access admin endpoint
    response = await client.get("/auth/is-admin/", headers=headers)
    assert response.status_code == 403


@pytest.mark.anyio
async def test_token_expiration(client: AsyncClient, regular_user):
    """Test that expired tokens are rejected"""
    # Create an expired token (valid 1 hour ago, expired now)
    expires_delta = timedelta(hours=-1)
    expired_token = create_token(regular_user.email, expires_delta=expires_delta)
    
    headers = {"Cookie": f"access_token=Bearer {expired_token}"}
    response = await client.get("/auth/check-auth", headers=headers)
    
    assert response.status_code == 401


@pytest.mark.anyio
async def test_invalid_token_format(client: AsyncClient):
    """Test that malformed tokens are rejected"""
    # Test with malformed token
    headers = {"Cookie": "access_token=not-a-valid-token-format"}
    response = await client.get("/auth/check-auth", headers=headers)
    
    assert response.status_code == 401


@pytest.mark.anyio
async def test_nonexistent_user(client: AsyncClient):
    """Test that tokens for non-existent users are rejected"""
    # Create token for non-existent user
    token = create_token("nonexistent@example.com")
    
    headers = {"Cookie": f"access_token=Bearer {token}"}
    response = await client.get("/auth/check-auth", headers=headers)
    
    assert response.status_code == 401


@pytest.mark.anyio
async def test_new_user_onboarding_status(client: AsyncClient, new_user):
    """Test that new users have correct onboarding status"""
    token = create_token(new_user.email)
    
    headers = {"Cookie": f"access_token=Bearer {token}"}
    response = await client.get("/auth/check-auth", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is True
    assert data["user"]["email"] == new_user.email
    assert data["user"]["onboarding_completed"] is False


@pytest.mark.anyio
async def test_logout(client: AsyncClient):
    """Test that logout deletes the auth cookie"""
    response = await client.post("/auth/logout")
    
    assert response.status_code == 200
    assert response.cookies.get("access_token") is None  # Cookie should be cleared 