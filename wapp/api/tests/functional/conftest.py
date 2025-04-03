import pytest
from dto.models import User


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
        email="admin@example.com",
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


@pytest.fixture
async def organization_owner():
    """Create an owner user for organization tests"""
    user = await User.create(
        username="Organization Owner",
        email="owner@example.com",
        is_admin=False,
        onboarding_completed=True
    )
    yield user
    await user.delete()


@pytest.fixture
async def organization_member():
    """Create a regular member user for organization tests"""
    user = await User.create(
        username="Organization Member",
        email="member@example.com",
        is_admin=False,
        onboarding_completed=True
    )
    yield user
    await user.delete()


@pytest.fixture
async def organization_guest():
    """Create a guest user for organization tests"""
    user = await User.create(
        username="Organization Guest",
        email="guest@example.com",
        is_admin=False,
        onboarding_completed=True
    )
    yield user
    await user.delete()
