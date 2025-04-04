import pytest
from uuid import uuid4
from httpx import AsyncClient
from dto.models import User, Organization, OrganizationMember
from dto.schemas import OrganizationType, OrganizationRole
from ..conftest import create_token


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
async def second_user():
    """Create a second regular user"""
    user = await User.create(
        username="Second User",
        email="second@example.com",
        is_admin=False,
        onboarding_completed=True
    )
    yield user
    await user.delete()


@pytest.fixture
async def organization(regular_user):
    """Create a test organization with the regular user as owner"""
    org = await Organization.create(
        id=uuid4(),
        name="Test Organization",
        type=OrganizationType.STARTUP
    )

    # Add regular user as owner
    await OrganizationMember.create(
        id=uuid4(),
        user=regular_user,
        organization=org,
        role=OrganizationRole.OWNER
    )

    yield org
    await org.delete()


@pytest.mark.anyio
async def test_create_organization(client: AsyncClient, regular_user):
    """Test creating a new organization"""
    token = create_token(regular_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Create request data
    data = {
        "name": "New Test Organization",
        "type": "startup"
    }

    response = await client.post("/organizations/", json=data, headers=headers)

    assert response.status_code == 201
    result = response.json()
    assert result["name"] == data["name"]
    assert result["type"] == data["type"]

    # Clean up created organization
    org = await Organization.filter(id=result["id"]).first()
    if org:
        await org.delete()


@pytest.mark.anyio
async def test_get_user_organizations(client: AsyncClient, regular_user, organization):
    """Test retrieving all organizations for a user"""
    token = create_token(regular_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.get("/organizations/", headers=headers)

    assert response.status_code == 200
    result = response.json()
    assert isinstance(result, list)
    assert len(result) > 0
    assert any(org["id"] == str(organization.id) for org in result)


@pytest.mark.anyio
async def test_get_organization_details(client: AsyncClient, regular_user, organization):
    """Test retrieving a specific organization's details"""
    token = create_token(regular_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.get(f"/organizations/{organization.id}", headers=headers)

    assert response.status_code == 200
    result = response.json()
    assert result["id"] == str(organization.id)
    assert result["name"] == organization.name


@pytest.mark.anyio
async def test_update_organization(client: AsyncClient, regular_user, organization):
    """Test updating an organization's details"""
    token = create_token(regular_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Update data
    data = {
        "name": "Updated Organization Name",
    }

    response = await client.put(f"/organizations/{organization.id}", json=data, headers=headers)

    assert response.status_code == 200
    result = response.json()
    assert result["name"] == data["name"]

    # Verify in database
    updated_org = await Organization.get(id=organization.id)
    assert updated_org.name == data["name"]


@pytest.mark.anyio
async def test_delete_organization(client: AsyncClient, regular_user, organization):
    """Test deleting an organization"""
    token = create_token(regular_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.delete(f"/organizations/{organization.id}", headers=headers)

    assert response.status_code == 204

    # Verify it's deleted from the database
    org_exists = await Organization.filter(id=organization.id).exists()
    assert not org_exists


@pytest.mark.anyio
async def test_get_organization_members(client: AsyncClient, regular_user, organization):
    """Test retrieving members of an organization"""
    token = create_token(regular_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.get(f"/organizations/{organization.id}/members", headers=headers)

    assert response.status_code == 200
    result = response.json()
    assert "members" in result
    assert len(result["members"]) == 1  # Should have the owner
    assert result["members"][0]["user"]["username"] == regular_user.username
    assert result["members"][0]["role"] == "owner"


@pytest.mark.anyio
async def test_add_member_to_organization(client: AsyncClient, regular_user, second_user, organization):
    """Test adding a new member to an organization"""
    # First, upgrade the regular_user to be an admin of the organization
    # This is needed because only admins can add members
    member = await OrganizationMember.filter(user_id=regular_user.id, organization_id=organization.id).first()
    member.role = OrganizationRole.ADMIN
    await member.save()

    token = create_token(regular_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Add second user as member via API
    data = {
        "user_id": second_user.id,
        "role": "member"
    }

    response = await client.post(
        f"/organizations/{organization.id}/members",
        json=data,
        headers=headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["user_id"] == second_user.id
    assert result["role"] == "member"

    # Verify in database
    membership = await OrganizationMember.filter(
        user_id=second_user.id,
        organization_id=organization.id
    ).first()
    assert membership is not None
    assert membership.role == OrganizationRole.MEMBER


@pytest.mark.anyio
async def test_update_member_role(client: AsyncClient, regular_user, second_user, organization):
    """Test updating a member's role in an organization"""
    # First, set up the organization with correct permissions
    # Make regular_user an owner (only owners can update roles)
    owner_member = await OrganizationMember.filter(user_id=regular_user.id, organization_id=organization.id).first()
    owner_member.role = OrganizationRole.OWNER
    await owner_member.save()

    # Add second_user as a member
    member = await OrganizationMember.create(
        id=uuid4(),
        user_id=second_user.id,
        organization_id=organization.id,
        role=OrganizationRole.MEMBER
    )

    token = create_token(regular_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Update role to admin
    data = {
        "role": "admin"
    }

    response = await client.put(
        f"/organizations/{organization.id}/members/{second_user.id}",
        json=data,
        headers=headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["user_id"] == second_user.id
    assert result["role"] == "admin"

    # Verify in database
    updated_member = await OrganizationMember.get(id=member.id)
    assert updated_member.role == OrganizationRole.ADMIN


@pytest.mark.anyio
async def test_remove_member(client: AsyncClient, regular_user, second_user, organization) -> None:
    """Test removing a member from an organization"""
    token = create_token(regular_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # First add the second user as a member
    await OrganizationMember.create(
        id=uuid4(),
        user_id=second_user.id,
        organization_id=organization.id,
        role=OrganizationRole.MEMBER
    )

    response = await client.delete(
        f"/organizations/{organization.id}/members/{second_user.id}",
        headers=headers
    )

    assert response.status_code == 204

    # Verify in database
    membership_exists = await OrganizationMember.filter(
        organization_id=organization.id,
        user_id=second_user.id
    ).exists()
    assert not membership_exists


@pytest.mark.anyio
async def test_unauthorized_organization_access(client: AsyncClient, regular_user, second_user) -> None:
    """Test that users cannot access organizations they are not members of"""
    # Create organization for second user
    org = await Organization.create(
        id=uuid4(),
        name="Second User's Organization",
        description="Private Organization",
        type=OrganizationType.STARTUP
    )

    # Add second user as owner
    await OrganizationMember.create(
        id=uuid4(),
        user=second_user,
        organization=org,
        role=OrganizationRole.OWNER
    )

    # Try to access with regular user
    token = create_token(regular_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.get(f"/organizations/{org.id}", headers=headers)

    assert response.status_code == 403

    # Clean up
    await org.delete()
