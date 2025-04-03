import pytest
from httpx import AsyncClient
from dto.models import User
from ..conftest import create_token


# Note: Using a test-specific fixture instead of conftest.py's regular_user
# since we need onboarding_completed=False specifically
@pytest.fixture
async def regular_user_not_onboarded():
    """Create a regular test user without onboarding completed"""
    user = await User.create(
        username="Regular User Not Onboarded",
        email="regular_not_onboarded@example.com",
        is_admin=False,
        onboarding_completed=False  # Initially not completed
    )
    yield user
    await user.delete()


@pytest.mark.anyio
async def test_get_user_preferences(client: AsyncClient, regular_user_not_onboarded):
    """Test retrieving user preferences"""
    token = create_token(regular_user_not_onboarded.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.get("/users/preferences", headers=headers)

    assert response.status_code == 200
    result = response.json()
    assert result["success"] is True
    assert result["onboarding_completed"] is False  # Should match the fixture
    assert result["user_id"] == regular_user_not_onboarded.id


@pytest.mark.anyio
async def test_update_onboarding_status(client: AsyncClient, regular_user_not_onboarded):
    """Test updating onboarding status"""
    token = create_token(regular_user_not_onboarded.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Update onboarding status to completed
    data = {
        "completed": True
    }

    response = await client.post("/users/onboarding/completed", json=data, headers=headers)

    assert response.status_code == 200
    result = response.json()
    assert result["success"] is True
    assert result["onboarding_completed"] is True
    assert result["user_id"] == regular_user_not_onboarded.id

    # Verify in database
    updated_user = await User.get(id=regular_user_not_onboarded.id)
    assert updated_user.onboarding_completed is True


@pytest.mark.anyio
async def test_update_user_preferences(client: AsyncClient, regular_user_not_onboarded):
    """Test updating user preferences"""
    token = create_token(regular_user_not_onboarded.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Update preferences
    data = {
        "onboarding_completed": True
    }

    response = await client.post("/users/preferences", json=data, headers=headers)

    assert response.status_code == 200
    result = response.json()
    assert result["success"] is True
    assert result["user_id"] == regular_user_not_onboarded.id

    # Verify in database
    updated_user = await User.get(id=regular_user_not_onboarded.id)
    assert updated_user.onboarding_completed is True


@pytest.mark.anyio
async def test_unauthenticated_access(client: AsyncClient):
    """Test that unauthenticated access is denied"""
    # Try to access preferences without authentication
    response = await client.get("/users/preferences")

    assert response.status_code == 401


@pytest.mark.anyio
async def test_partial_preference_update(client: AsyncClient, regular_user_not_onboarded):
    """Test updating only some preferences"""
    token = create_token(regular_user_not_onboarded.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Set initial state
    regular_user_not_onboarded.onboarding_completed = True
    await regular_user_not_onboarded.save()

    # Update with empty preferences (should not change anything)
    data = {}

    response = await client.post("/users/preferences", json=data, headers=headers)

    assert response.status_code == 200
    result = response.json()
    assert result["success"] is True

    # Verify in database (should still be True)
    updated_user = await User.get(id=regular_user_not_onboarded.id)
    assert updated_user.onboarding_completed is True

    # Now update with False
    data = {"onboarding_completed": False}

    response = await client.post("/users/preferences", json=data, headers=headers)

    assert response.status_code == 200

    # Verify in database
    updated_user = await User.get(id=regular_user_not_onboarded.id)
    assert updated_user.onboarding_completed is False
