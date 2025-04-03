import pytest
import os
import json
import base64
from uuid import uuid4
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
from httpx import AsyncClient
from dto.models import User, Invitation, Organization
from dto.schemas import OrganizationRole, OrganizationType


class MockResponse:
    def __init__(self, json_data, status_code):
        self.json_data = json_data
        self.status_code = status_code
        self.text = json.dumps(json_data)

    def json(self):
        return self.json_data


# Mock for Google OAuth token response
def mock_post_token(*args, **kwargs):
    data = {
        "access_token": "mock_access_token",
        "expires_in": 3600,
        "token_type": "Bearer",
        "refresh_token": "mock_refresh_token"
    }
    return MockResponse(data, 200)


# Mock for Google userinfo response
def mock_get_userinfo(*args, **kwargs):
    data = {
        "id": "12345",
        "email": "test@example.com",
        "verified_email": True,
        "name": "Test User",
        "given_name": "Test",
        "family_name": "User",
        "picture": "https://example.com/photo.jpg"
    }
    return MockResponse(data, 200)


# Mock for organization_services.add_member_to_organization to avoid validation issues
async def mock_add_member_to_organization(*args, **kwargs):
    return MagicMock()


@pytest.fixture(scope="function", autouse=True)
async def cleanup_test_user():
    """Clean up test user before and after tests"""
    # Clean up before test
    user = await User.filter(email="test@example.com").first()
    if user:
        await user.delete()

    yield

    # Clean up after test
    user = await User.filter(email="test@example.com").first()
    if user:
        await user.delete()


@pytest.fixture
async def client_with_mocked_google(client: AsyncClient):
    """Test client with mocked Google OAuth"""
    with patch('requests.post', side_effect=mock_post_token), \
         patch('requests.get', side_effect=mock_get_userinfo), \
         patch('services.organization_services.add_member_to_organization', side_effect=mock_add_member_to_organization):
        yield client


@pytest.fixture
async def test_organization():
    """Create a test organization"""
    org = await Organization.create(
        id=uuid4(),
        name="Test OAuth Organization",
        type=OrganizationType.STARTUP
    )
    yield org
    await org.delete()


@pytest.fixture
async def oauth_admin_user():
    """Create an admin user specific for OAuth tests"""
    user = await User.create(
        username="OAuth Admin",
        email="oauth_admin@laneo.io",  # Use admin domain
        is_admin=True,
        onboarding_completed=True
    )
    yield user
    await user.delete()


@pytest.fixture
async def valid_invitation(oauth_admin_user, test_organization):
    """Create a valid invitation for the test email"""
    invitation = await Invitation.create(
        id=uuid4(),
        code=str(uuid4()),
        email="test@example.com",  # Same as mock response email
        created_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        used=False,
        role=OrganizationRole.MEMBER,
        created_by=oauth_admin_user,
        organization=test_organization
    )
    yield invitation
    await invitation.delete()


# Test for OAuth login callback
@pytest.mark.skip(reason="TODO: Rewrite without heavy mocking to test actual functionality")
@pytest.mark.anyio
async def test_google_oauth_login(client_with_mocked_google, valid_invitation):
    """Test Google OAuth login flow with mocked responses"""
    # Use the real invitation code from the database
    invitation_state = {"invitation_code": valid_invitation.code}
    state_param = base64.urlsafe_b64encode(json.dumps(invitation_state).encode()).decode()

    # Test the Google callback endpoint
    response = await client_with_mocked_google.get(
        "/auth/google/callback",
        params={"code": "mock_auth_code", "state": state_param}
    )

    # Should redirect to frontend with token
    assert response.status_code == 307
    location = response.headers.get("location", "")
    assert "google/callback?token=" in location, f"Unexpected redirect location: {location}"

    # Verify user was created
    user = await User.filter(email="test@example.com").first()
    assert user is not None
    assert user.username == "Test User"
    assert user.onboarding_completed is False


@pytest.mark.skip(reason="TODO: Rewrite without heavy mocking to test actual functionality")
@pytest.mark.anyio
async def test_google_oauth_existing_user(client_with_mocked_google):
    """Test Google OAuth login with existing user"""
    # Create user before test
    user = await User.create(
        username="Existing User",
        email="test@example.com",  # Same email as mock response
        is_admin=False,
        onboarding_completed=True
    )

    # Test the Google callback endpoint
    response = await client_with_mocked_google.get(
        "/auth/google/callback",
        params={"code": "mock_auth_code"}
    )

    # Should redirect to frontend with token
    assert response.status_code == 307
    assert "google/callback?token=" in response.headers.get("location", "")

    # Verify user wasn't changed
    updated_user = await User.filter(email="test@example.com").first()
    assert updated_user.id == user.id
    assert updated_user.username == "Existing User"  # Name should not be updated from Google
    assert updated_user.onboarding_completed is True  # Should maintain onboarding status


@pytest.mark.anyio
async def test_google_login_redirect(client: AsyncClient):
    """Test the Google login redirect URL generation"""
    response = await client.get("/auth/login/google")

    assert response.status_code == 200
    data = response.json()

    # Verify URL contains required OAuth parameters
    assert "url" in data
    url = data["url"]
    assert "accounts.google.com/o/oauth2/auth" in url
    assert "response_type=code" in url
    assert f"client_id={os.getenv('GOOGLE_CLIENT_ID')}" in url
    assert "redirect_uri=" in url
    assert "scope=openid%20profile%20email" in url

    # Test with invitation code
    response = await client.get("/auth/login/google", params={"invitation_code": "test123"})

    assert response.status_code == 200
    data = response.json()
    url = data["url"]
    assert "&state=" in url  # Should include state parameter with invitation code
