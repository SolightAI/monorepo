import pytest
from uuid import uuid4
from httpx import AsyncClient
from dto.models import User, Organization, OrganizationMember, Product, Epic
from dto.schemas import OrganizationType, OrganizationRole
from ..conftest import create_token


@pytest.fixture
async def organization_owner():
    """Create an owner user for organization"""
    user = await User.create(
        username="Organization Owner",
        email="owner@example.com",
        is_admin=False,
        onboarding_completed=True
    )
    yield user
    await user.delete()


@pytest.fixture
async def organization_admin():
    """Create an admin user for organization"""
    user = await User.create(
        username="Organization Admin",
        email="orgadmin@example.com",
        is_admin=False,
        onboarding_completed=True
    )
    yield user
    await user.delete()


@pytest.fixture
async def organization_member():
    """Create a regular member user for organization"""
    user = await User.create(
        username="Organization Member",
        email="member@example.com",
        is_admin=False,
        onboarding_completed=True
    )
    yield user
    await user.delete()


@pytest.fixture
async def non_member_user():
    """Create a user who is not part of the organization"""
    user = await User.create(
        username="Non Member",
        email="nonmember@example.com",
        is_admin=False,
        onboarding_completed=True
    )
    yield user
    await user.delete()


@pytest.fixture
async def organization(organization_owner, organization_admin, organization_member):
    """Create a test organization with different user roles"""
    org = await Organization.create(
        id=uuid4(),
        name="Test Permission Organization",
        description="Organization for testing permissions",
        type=OrganizationType.STARTUP
    )

    # Add owner
    await OrganizationMember.create(
        id=uuid4(),
        user=organization_owner,
        organization=org,
        role=OrganizationRole.OWNER
    )

    # Add admin
    await OrganizationMember.create(
        id=uuid4(),
        user=organization_admin,
        organization=org,
        role=OrganizationRole.ADMIN
    )

    # Add regular member
    await OrganizationMember.create(
        id=uuid4(),
        user=organization_member,
        organization=org,
        role=OrganizationRole.MEMBER
    )

    yield org
    await org.delete()


@pytest.fixture
async def product(organization):
    """Create a test product in the organization"""
    product = await Product.create(
        id=uuid4(),
        name="Test Permission Product",
        description="A product for testing permissions",
        url="https://example.com/product",
        documentation="Product documentation",
        links_to_documentation=[],
        organization=organization
    )

    yield product
    await product.delete()


@pytest.fixture
async def epic(product):
    """Create a test epic in the product"""
    epic = await Epic.create(
        id=uuid4(),
        name="Test Permission Epic",
        description="An epic for testing permissions",
        product=product
    )

    yield epic
    await epic.delete()


@pytest.mark.anyio
async def test_non_member_cannot_access_organization_resources(
    client: AsyncClient,
    non_member_user,
    organization
):
    """Test that users who are not members cannot access organization resources"""
    token = create_token(non_member_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Attempt to access organization details
    response = await client.get(
        f"/organizations/{organization.id}",
        headers=headers
    )

    # Should be forbidden (403) or not found (404)
    assert response.status_code in [403, 404]


@pytest.mark.anyio
async def test_member_cannot_update_organization(
    client: AsyncClient,
    organization_member,
    organization
):
    """Test that regular members cannot update organization details"""
    token = create_token(organization_member.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Update data
    data = {
        "name": "Renamed Organization",
        "description": "Updated description"
    }

    response = await client.put(
        f"/organizations/{organization.id}",
        json=data,
        headers=headers
    )

    # Should be forbidden
    assert response.status_code == 403


@pytest.mark.anyio
async def test_admin_can_update_organization(
    client: AsyncClient,
    organization_admin,
    organization
):
    """Test that admins can update organization details"""
    token = create_token(organization_admin.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Update data
    data = {
        "name": "Admin Updated Organization",
    }

    response = await client.put(
        f"/organizations/{organization.id}",
        json=data,
        headers=headers
    )

    # Should succeed
    assert response.status_code == 200
    result = response.json()
    assert result["name"] == data["name"]


@pytest.mark.anyio
async def test_member_cannot_create_product(
    client: AsyncClient,
    organization_member,
    organization
):
    """Test that regular members cannot create products"""
    token = create_token(organization_member.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Create product data
    data = {
        "name": "Unauthorized Product",
        "description": "This product creation should fail",
        "url": "https://example.com/unauthorized",
        "documentation": "Documentation",
        "links_to_documentation": [],
        "organization_id": str(organization.id)
    }

    response = await client.post(
        "/products/",
        json=data,
        headers=headers
    )

    # Should be forbidden
    assert response.status_code == 403


@pytest.mark.anyio
async def test_admin_can_create_product(
    client: AsyncClient,
    organization_admin,
    organization
):
    """Test that admins can create products"""
    token = create_token(organization_admin.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Create product data
    data = {
        "name": "Admin Created Product",
        "description": "A product created by admin",
        "url": "https://example.com/admin-product",
        "documentation": "Documentation",
        "links_to_documentation": [],
        "organization_id": str(organization.id)
    }

    response = await client.post(
        "/products/",
        json=data,
        headers=headers
    )

    # Should succeed
    assert response.status_code == 200
    result = response.json()
    assert result["name"] == data["name"]

    # Clean up
    product_id = result["id"]
    product = await Product.get(id=product_id)
    await product.delete()


@pytest.mark.anyio
async def test_owner_can_delete_product(
    client: AsyncClient,
    organization_owner
):
    """Test that owners can delete products"""
    token = create_token(organization_owner.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Create a product first
    org = await Organization.filter(members__user__email=organization_owner.email).first()
    product = await Product.create(
        id=uuid4(),
        name="Product to Delete",
        description="This will be deleted",
        url="https://example.com/to-delete",
        documentation="Documentation",
        links_to_documentation=[],
        organization=org
    )

    response = await client.delete(
        f"/products/{product.id}",
        headers=headers
    )

    # Should succeed
    assert response.status_code == 200
    result = response.json()
    assert result["success"] is True

    # Verify product is deleted
    product_exists = await Product.filter(id=product.id).exists()
    assert not product_exists
