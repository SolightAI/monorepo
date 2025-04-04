import pytest
from uuid import uuid4
from httpx import AsyncClient
from dto.models import UserStory, AcceptanceCriteria
from ..conftest import create_token


@pytest.fixture
async def user_story(test_feature):
    """Create a test user story in the feature"""
    user_story = await UserStory.create(
        id=uuid4(),
        name="Test User Story for AC",
        description="A user story for testing acceptance criteria",
        feature=test_feature,
        status="DRAFT"
    )

    yield user_story
    await user_story.delete()


@pytest.fixture
async def acceptance_criteria(test_feature):
    """Create a test acceptance criteria for the feature"""
    ac = await AcceptanceCriteria.create(
        id=uuid4(),
        name="Test Acceptance Criteria",
        description="Feature is considered complete when this criteria is met",
        feature=test_feature
    )

    yield ac
    await ac.delete()


# Test basic CRUD operations with admin user
@pytest.mark.anyio
async def test_create_acceptance_criteria(client: AsyncClient, admin_user, test_feature):
    """Test creating a new acceptance criteria"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    data = {
        "name": "New Test Acceptance Criteria",
        "description": "This is a test acceptance criteria created via API",
        "feature_id": str(test_feature.id)
    }

    response = await client.post(
        "/acceptance-criteria/",
        json=data,
        headers=headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["name"] == data["name"]
    assert result["description"] == data["description"]
    assert result["feature_id"] == data["feature_id"]

    # Cleanup
    ac_id = result["id"]
    ac = await AcceptanceCriteria.get(id=ac_id)
    await ac.delete()


@pytest.mark.anyio
async def test_get_acceptance_criteria(client: AsyncClient, admin_user, acceptance_criteria):
    """Test getting an acceptance criteria by ID"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.get(
        f"/acceptance-criteria/{acceptance_criteria.id}",
        headers=headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["id"] == str(acceptance_criteria.id)
    assert result["name"] == acceptance_criteria.name
    assert result["description"] == acceptance_criteria.description


@pytest.mark.anyio
async def test_get_all_acceptance_criteria(client: AsyncClient, admin_user, acceptance_criteria):
    """Test getting all acceptance criteria"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.get(
        "/acceptance-criteria/",
        headers=headers
    )

    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    assert len(results) >= 1  # At least our test AC should be present

    # Find our test AC in the results
    found = False
    for ac in results:
        if ac["id"] == str(acceptance_criteria.id):
            found = True
            break

    assert found, "Test acceptance criteria not found in results"


@pytest.mark.anyio
async def test_get_acceptance_criteria_by_feature(client: AsyncClient, admin_user, test_feature, acceptance_criteria):
    """Test getting all acceptance criteria for a specific feature"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.get(
        f"/acceptance-criteria/by-feature/{test_feature.id}",
        headers=headers
    )

    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    assert len(results) >= 1  # At least our test AC should be present

    # Verify our test AC is in the results
    found = False
    for ac in results:
        if ac["id"] == str(acceptance_criteria.id):
            found = True
            break

    assert found, "Test acceptance criteria not found in feature's acceptance criteria"


@pytest.mark.anyio
async def test_update_acceptance_criteria(client: AsyncClient, admin_user, acceptance_criteria):
    """Test updating an acceptance criteria"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    data = {
        "name": "Updated Acceptance Criteria Name",
        "description": "Updated acceptance criteria description"
    }

    response = await client.put(
        f"/acceptance-criteria/{acceptance_criteria.id}",
        json=data,
        headers=headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["id"] == str(acceptance_criteria.id)
    assert result["name"] == data["name"]
    assert result["description"] == data["description"]


@pytest.mark.anyio
async def test_delete_acceptance_criteria(client: AsyncClient, admin_user, test_feature):
    """Test deleting an acceptance criteria"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Create a new acceptance criteria to delete
    ac = await AcceptanceCriteria.create(
        id=uuid4(),
        name="AC to Delete",
        description="This acceptance criteria will be deleted",
        feature=test_feature
    )

    response = await client.delete(
        f"/acceptance-criteria/{ac.id}",
        headers=headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["success"] is True

    # Verify the acceptance criteria is deleted
    ac_exists = await AcceptanceCriteria.filter(id=ac.id).exists()
    assert not ac_exists


# Role-based permission tests
@pytest.mark.anyio
async def test_owner_can_create_acceptance_criteria(client: AsyncClient, organization_owner, test_feature):
    """Test that organization owner can create acceptance criteria"""
    token = create_token(organization_owner.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    data = {
        "name": "Owner Created AC",
        "description": "AC created by organization owner",
        "feature_id": str(test_feature.id)
    }

    response = await client.post(
        "/acceptance-criteria/",
        json=data,
        headers=headers
    )

    assert response.status_code == 200
    result = response.json()

    # Cleanup
    ac_id = result["id"]
    ac = await AcceptanceCriteria.get(id=ac_id)
    await ac.delete()


@pytest.mark.anyio
async def test_member_can_access_acceptance_criteria(client: AsyncClient, organization_member, acceptance_criteria):
    """Test that regular member can access acceptance criteria"""
    token = create_token(organization_member.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.get(
        f"/acceptance-criteria/{acceptance_criteria.id}",
        headers=headers
    )

    assert response.status_code == 200


@pytest.mark.xfail(reason="Need to fix the codebase")  # FIXME
@pytest.mark.anyio
async def test_guest_cannot_delete_acceptance_criteria(client: AsyncClient, organization_guest, acceptance_criteria):
    """Test that guest cannot delete acceptance criteria"""
    token = create_token(organization_guest.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.delete(
        f"/acceptance-criteria/{acceptance_criteria.id}",
        headers=headers
    )

    # Guests should be forbidden from deleting resources
    assert response.status_code == 403


@pytest.mark.anyio
async def test_invalid_feature_id_for_acceptance_criteria_by_feature(client: AsyncClient, admin_user):
    """Test getting acceptance criteria with an invalid feature ID"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    invalid_id = uuid4()

    response = await client.get(
        f"/acceptance-criteria/by-feature/{invalid_id}",
        headers=headers
    )

    # Should return an empty list, not an error
    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    assert len(results) == 0
