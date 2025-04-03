import pytest
from dto.models import User, Organization, OrganizationMember, Product, Epic, Feature
from dto.schemas import OrganizationType, OrganizationRole
from uuid import uuid4


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


def create_token(email: str) -> str:
    """Create a token for authentication"""
    # Token creation logic specific to your application
    return f"{email}_test_token"


@pytest.fixture
async def test_organization(admin_user, organization_owner, organization_member, organization_guest):
    """Create a test organization with all role types"""
    org = await Organization.create(
        id=uuid4(),
        name="Test Organization",
        type=OrganizationType.ENTERPRISE
    )

    # Add users with different roles
    await OrganizationMember.create(
        id=uuid4(),
        user=admin_user,
        organization=org,
        role=OrganizationRole.ADMIN
    )

    await OrganizationMember.create(
        id=uuid4(),
        user=organization_owner,
        organization=org,
        role=OrganizationRole.OWNER
    )

    await OrganizationMember.create(
        id=uuid4(),
        user=organization_member,
        organization=org,
        role=OrganizationRole.MEMBER
    )

    await OrganizationMember.create(
        id=uuid4(),
        user=organization_guest,
        organization=org,
        role=OrganizationRole.GUEST
    )

    yield org
    await org.delete()


@pytest.fixture
async def test_product(test_organization):
    """Create a test product in the organization"""
    product = await Product.create(
        id=uuid4(),
        name="Test Product",
        description="A product for testing endpoints",
        url="https://example.com/test-product",
        documentation="Product documentation",
        links_to_documentation=[],
        organization=test_organization
    )

    yield product
    await product.delete()


@pytest.fixture
async def test_epic(test_product):
    """Create a test epic in the product"""
    epic = await Epic.create(
        id=uuid4(),
        name="Test Epic",
        description="An epic for testing endpoints",
        product=test_product
    )

    yield epic
    await epic.delete()


@pytest.fixture
async def test_feature(test_epic):
    """Create a test feature in the epic"""
    feature = await Feature.create(
        id=uuid4(),
        name="Test Feature",
        description="A feature for testing endpoints",
        epic=test_epic,
        urls=[]
    )

    yield feature
    await feature.delete()
