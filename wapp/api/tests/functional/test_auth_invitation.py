import pytest
from uuid import uuid4
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient
from dto.models import User, Invitation, Organization
from dto.schemas import OrganizationRole, OrganizationType
from ..conftest import create_token


@pytest.fixture
async def organization():
    """Create a test organization"""
    org = await Organization.create(
        id=uuid4(),
        name="Test Organization",
        type=OrganizationType.STARTUP
    )
    yield org
    await org.delete()


@pytest.fixture
async def valid_invitation(admin_user, organization):
    """Create a valid invitation with expiration in the future"""
    invitation = await Invitation.create(
        id=uuid4(),
        code=str(uuid4()),
        email="invited@example.com",
        created_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        used=False,
        role=OrganizationRole.MEMBER,
        created_by=admin_user,
        organization=organization
    )
    yield invitation
    await invitation.delete()


@pytest.fixture
async def expired_invitation(admin_user, organization):
    """Create an expired invitation"""
    invitation = await Invitation.create(
        id=uuid4(),
        code=str(uuid4()),
        email="expired@example.com",
        created_at=datetime.now(timezone.utc) - timedelta(days=14),
        expires_at=datetime.now(timezone.utc) - timedelta(days=7),
        used=False,
        role=OrganizationRole.MEMBER,
        created_by=admin_user,
        organization=organization
    )
    yield invitation
    await invitation.delete()


@pytest.fixture
async def used_invitation(admin_user, organization):
    """Create an invitation that has already been used"""
    # Create a user who used the invitation
    user = await User.create(
        username="Used Invitation User",
        email="used@example.com",
        is_admin=False,
        onboarding_completed=True
    )

    invitation = await Invitation.create(
        id=uuid4(),
        code=str(uuid4()),
        email="used@example.com",
        created_at=datetime.now(timezone.utc) - timedelta(days=5),
        expires_at=datetime.now(timezone.utc) + timedelta(days=2),
        used=True,
        used_at=datetime.now(timezone.utc) - timedelta(days=3),
        role=OrganizationRole.MEMBER,
        created_by=admin_user,
        organization=organization,
        used_by=user
    )

    yield invitation
    await invitation.delete()
    await user.delete()


# Test cases
@pytest.mark.anyio
async def test_validate_valid_invitation(client: AsyncClient, valid_invitation, admin_user):
    """Test validation of a valid invitation code"""
    # Create admin token to access invitation validation endpoint
    token = create_token(admin_user.email)

    headers = {"Cookie": f"access_token=Bearer {token}"}
    response = await client.get(
        f"/invitations/validate/{valid_invitation.code}/",
        params={"email": "invited@example.com"},
        headers=headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["code"] == valid_invitation.code
    assert data["email"] == valid_invitation.email
    assert data["organization_id"] == str(valid_invitation.organization_id)
    assert data["role"] == valid_invitation.role.value


@pytest.mark.anyio
async def test_validate_expired_invitation(client: AsyncClient, expired_invitation, admin_user):
    """Test validation of an expired invitation code"""
    # Create admin token
    token = create_token(admin_user.email)

    headers = {"Cookie": f"access_token=Bearer {token}"}
    response = await client.get(
        f"/invitations/validate/{expired_invitation.code}/",
        params={"email": "expired@example.com"},
        headers=headers
    )

    assert response.status_code == 400
    assert "expired" in response.json()["detail"].lower()


@pytest.mark.anyio
async def test_validate_used_invitation(client: AsyncClient, used_invitation, admin_user):
    """Test validation of an invitation that has already been used"""
    # Create admin token
    token = create_token(admin_user.email)

    headers = {"Cookie": f"access_token=Bearer {token}"}
    response = await client.get(
        f"/invitations/validate/{used_invitation.code}/",
        params={"email": "used@example.com"},
        headers=headers
    )

    assert response.status_code == 400
    assert "already been used" in response.json()["detail"].lower()


@pytest.mark.anyio
async def test_admin_create_signup_invitation(client: AsyncClient, admin_user):
    """Test creation of a signup invitation by admin user (signup invitations)"""
    # Create admin token
    token = create_token(admin_user.email)

    headers = {"Cookie": f"access_token=Bearer {token}"}
    email = "newuser@example.com"
    data = {
        "email": email,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
    }

    # This endpoint is for signup invitations (admin only)
    response = await client.post(
        "/invitations/",
        json=data,
        headers=headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["email"] == email
    assert result["code"] is not None
    assert result["organization_id"] is None  # Signup invitations don't have organization

    # Verify it was created in the database
    invitation = await Invitation.filter(code=result["code"]).first()
    assert invitation is not None
    assert invitation.email == email
    assert invitation.created_by_id == admin_user.id

    # Clean up
    await invitation.delete()


@pytest.mark.anyio
async def test_create_organization_invitation(client: AsyncClient, regular_user, organization):
    """Test creation of an organization invitation by regular user (org invitations)"""
    # Check if user is an admin or owner of organization first
    # In a real scenario this would require association with the organization

    # Create user token
    token = create_token(regular_user.email)

    headers = {"Cookie": f"access_token=Bearer {token}"}
    email = "newmember@example.com"
    data = {
        "email": email,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
        "organization_id": str(organization.id),
        "role": "member"
    }

    # Using the regular invitation endpoint with organization data
    response = await client.post(
        "/invitations/",
        json=data,
        headers=headers
    )

    # This should fail because regular user is not an admin of organization
    assert response.status_code == 403


@pytest.mark.anyio
async def test_non_admin_cannot_create_signup_invitation(client: AsyncClient):
    """Test that non-admin users cannot create signup invitations"""
    # Create regular user
    user = await User.create(
        username="Non Admin User",
        email="nonadmin@example.com",
        is_admin=False,
        onboarding_completed=True
    )

    # Create user token
    token = create_token(user.email)

    headers = {"Cookie": f"access_token=Bearer {token}"}
    data = {
        "email": "cannotinvite@example.com",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
    }

    # Using the invitation endpoint for a signup (no organization_id)
    response = await client.post(
        "/invitations/",
        json=data,
        headers=headers
    )

    # Should be forbidden for non-admin users
    assert response.status_code == 403

    # Clean up
    await user.delete()
