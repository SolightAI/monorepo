import pytest
from uuid import uuid4
from httpx import AsyncClient
from dto.models import UserStory
from ..conftest import create_token


@pytest.fixture
async def user_story(test_feature):
    """Create a test user story in the feature"""
    user_story = await UserStory.create(
        id=uuid4(),
        name="Test User Story",
        description="As a user, I want to test the API, so that I can verify it works",
        feature=test_feature,
        status="DRAFT"
    )

    yield user_story
    await user_story.delete()


# Test basic CRUD operations with admin user
@pytest.mark.anyio
async def test_create_user_story(client: AsyncClient, admin_user, test_feature):
    """Test creating a new user story"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    data = {
        "name": "New Test User Story",
        "description": "As a tester, I want to create a user story, so that I can test the API",
        "feature_id": str(test_feature.id),
    }

    response = await client.post(
        "/user-stories/",
        json=data,
        headers=headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["name"] == data["name"]
    assert result["description"] == data["description"]
    assert result["feature_id"] == data["feature_id"]

    # Cleanup
    user_story_id = result["id"]
    user_story = await UserStory.get(id=user_story_id)
    await user_story.delete()


@pytest.mark.anyio
async def test_get_user_story(client: AsyncClient, admin_user, user_story):
    """Test getting a user story by ID"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.get(
        f"/user-stories/{user_story.id}",
        headers=headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["id"] == str(user_story.id)
    assert result["name"] == user_story.name
    assert result["description"] == user_story.description


@pytest.mark.anyio
async def test_update_user_story(client: AsyncClient, admin_user, user_story):
    """Test updating a user story"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    data = {
        "name": "Updated User Story Name",
        "description": "Updated user story description",
    }

    response = await client.put(
        f"/user-stories/{user_story.id}",
        json=data,
        headers=headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["id"] == str(user_story.id)
    assert result["name"] == data["name"]
    assert result["description"] == data["description"]


@pytest.mark.anyio
async def test_delete_user_story(client: AsyncClient, admin_user, test_feature):
    """Test deleting a user story"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Create a new user story to delete
    user_story = await UserStory.create(
        id=uuid4(),
        name="User Story to Delete",
        description="This user story will be deleted",
        feature=test_feature,
        status="DRAFT"
    )

    response = await client.delete(
        f"/user-stories/{user_story.id}",
        headers=headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["success"] is True

    # Verify the user story is deleted
    user_story_exists = await UserStory.filter(id=user_story.id).exists()
    assert not user_story_exists


# Role-based permission tests
@pytest.mark.anyio
async def test_owner_can_create_user_story(client: AsyncClient, organization_owner, test_feature):
    """Test that organization owner can create user stories"""
    token = create_token(organization_owner.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    data = {
        "name": "Owner Created User Story",
        "description": "User story created by organization owner",
        "feature_id": str(test_feature.id),
        "status": "DRAFT"
    }

    response = await client.post(
        "/user-stories/",
        json=data,
        headers=headers
    )

    assert response.status_code == 200
    result = response.json()

    # Cleanup
    user_story_id = result["id"]
    user_story = await UserStory.get(id=user_story_id)
    await user_story.delete()


@pytest.mark.anyio
async def test_member_can_access_user_story(client: AsyncClient, organization_member, user_story):
    """Test that regular member can access user stories"""
    token = create_token(organization_member.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.get(
        f"/user-stories/{user_story.id}",
        headers=headers
    )

    assert response.status_code == 200


@pytest.mark.xfail(reason="Need to fix the codebase")  # FIXME
@pytest.mark.anyio
async def test_guest_cannot_delete_user_story(client: AsyncClient, organization_guest, user_story):
    """Test that guest cannot delete user stories"""
    token = create_token(organization_guest.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.delete(
        f"/user-stories/{user_story.id}",
        headers=headers
    )

    # Guests should be forbidden from deleting resources
    assert response.status_code == 403


@pytest.mark.anyio
async def test_invalid_feature_id_for_generation(client: AsyncClient, admin_user):
    """Test generating user stories with invalid feature ID"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    invalid_id = uuid4()

    response = await client.post(
        f"/user-stories/generate?feature_id={invalid_id}",
        headers=headers
    )

    # Should return 404 Not Found
    assert response.status_code == 404
