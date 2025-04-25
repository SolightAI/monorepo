import pytest
from uuid import uuid4
from httpx import AsyncClient
from dto.models import User, Organization, OrganizationMember, Product
from dto.schemas import OrganizationType, OrganizationRole
from ..conftest import create_token


@pytest.fixture
async def organization_admin_user():
    """Create an admin user specific for organization (not system admin)"""
    user = await User.create(
        username="Organization Admin",
        email="orgadmin@example.com",
        is_admin=False,  # Not a system admin but will be an org admin
        onboarding_completed=True
    )
    yield user
    await user.delete()


@pytest.fixture
async def non_member_user():
    """Create a user who is not a member of the organization"""
    user = await User.create(
        username="Non Member",
        email="nonmember@example.com",
        is_admin=False,
        onboarding_completed=True
    )
    yield user
    await user.delete()


@pytest.fixture
async def organization(regular_user, organization_admin_user):
    """Create a test organization with users as members"""
    org = await Organization.create(
        id=uuid4(),
        name="Test Product Organization",
        description="Organization for Product API tests",
        type=OrganizationType.STARTUP
    )

    # Add regular user as member
    await OrganizationMember.create(
        id=uuid4(),
        user=regular_user,
        organization=org,
        role=OrganizationRole.MEMBER
    )

    # Add admin user as admin
    await OrganizationMember.create(
        id=uuid4(),
        user=organization_admin_user,
        organization=org,
        role=OrganizationRole.ADMIN
    )

    yield org
    await org.delete()


@pytest.fixture
async def product(organization):
    """Create a test product in the organization"""
    product = await Product.create(
        id=uuid4(),
        name="Test Product",
        description="A test product for API tests",
        url="https://example.com/product",
        documentation="Product documentation for testing",
        links_to_documentation=[],
        organization=organization
    )

    yield product
    await product.delete()


@pytest.mark.anyio
async def test_get_products_list(client: AsyncClient, regular_user, organization, product):
    """Test retrieving products list for an organization"""
    token = create_token(regular_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.get(
        "/products/",
        params={"organization_id": str(organization.id)},
        headers=headers
    )

    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    assert len(results) > 0
    assert any(p["id"] == str(product.id) for p in results)


@pytest.mark.anyio
async def test_get_product_details(client: AsyncClient, regular_user, organization, product):
    """Test retrieving a product's details"""
    token = create_token(regular_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.get(
        f"/products/{product.id}",
        params={"organization_id": str(organization.id)},
        headers=headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["id"] == str(product.id)
    assert result["name"] == product.name
    assert result["description"] == product.description
    assert result["organization_id"] == str(organization.id)


@pytest.mark.anyio
async def test_create_product(
    client: AsyncClient, 
    organization_admin_user, 
    organization,
    mocker
):
    """Test creating a new product as an admin user"""
    # Patch the trigger_url_validation function
    mocker.patch(
        "endpoints.product_endpoints.trigger_url_validation",
        return_value="mocked_task_id"  # Or return None if you prefer
    )

    token = create_token(organization_admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Create request data with proper LinkDocument format
    data = {
        "name": "New Product",
        "description": "A new product created in functional test",
        "url": "https://example.com/newproduct",
        "documentation": "Documentation for new product",
        "links_to_documentation": [],
        "organization_id": str(organization.id)
    }

    response = await client.post("/products/", json=data, headers=headers)

    # Check for success and grab the ID
    assert response.status_code == 200
    result = response.json()
    assert result["name"] == data["name"]
    assert result["description"] == data["description"]
    assert result["organization_id"] == data["organization_id"]

    # Verify in database
    created_product = await Product.filter(name=data["name"]).first()
    assert created_product is not None
    assert str(created_product.organization_id) == data["organization_id"]

    # Clean up the created product
    if created_product:
        await created_product.delete()


@pytest.mark.anyio
async def test_regular_user_cannot_create_product(client: AsyncClient, regular_user, organization):
    """Test that regular (non-admin) users cannot create products"""
    token = create_token(regular_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Create request data
    data = {
        "name": "Unauthorized Product",
        "description": "This product creation should fail",
        "url": "https://example.com/unauthorized",
        "documentation": "Documentation",
        "links_to_documentation": [],
        "organization_id": str(organization.id)
    }

    response = await client.post("/products/", json=data, headers=headers)

    # Should fail with permission error
    assert response.status_code == 403


@pytest.mark.anyio
async def test_update_product(client: AsyncClient, organization_admin_user, organization, product):
    """Test updating a product as an admin user"""
    token = create_token(organization_admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Update data
    data = {
        "name": "Updated Product Name",
        "description": "Updated product description"
    }

    response = await client.put(f"/products/{product.id}", json=data, headers=headers)

    assert response.status_code == 200
    result = response.json()
    assert result["name"] == data["name"]
    assert result["description"] == data["description"]
    assert result["id"] == str(product.id)

    # Verify in database
    updated_product = await Product.get(id=product.id)
    assert updated_product.name == data["name"]
    assert updated_product.description == data["description"]


@pytest.mark.anyio
async def test_regular_user_cannot_update_product(client: AsyncClient, regular_user, product):
    """Test that regular (non-admin) users cannot update products"""
    token = create_token(regular_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Update data
    data = {
        "name": "Unauthorized Update",
        "description": "This update should fail"
    }

    response = await client.put(f"/products/{product.id}", json=data, headers=headers)

    # Should fail with permission error
    assert response.status_code == 403


@pytest.mark.anyio
async def test_delete_product(client: AsyncClient, organization_admin_user, organization):
    """Test deleting a product as an admin user"""
    # Create a product to delete
    product_to_delete = await Product.create(
        id=uuid4(),
        name="Product to Delete",
        description="This product will be deleted",
        url="https://example.com/delete",
        documentation="Delete test documentation",
        links_to_documentation=[],
        organization=organization
    )

    token = create_token(organization_admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.delete(f"/products/{product_to_delete.id}", headers=headers)

    assert response.status_code == 200
    result = response.json()
    assert result["success"] is True

    # Verify it's deleted from the database
    product_exists = await Product.filter(id=product_to_delete.id).exists()
    assert not product_exists


@pytest.mark.anyio
async def test_regular_user_cannot_delete_product(client: AsyncClient, regular_user, product):
    """Test that regular (non-admin) users cannot delete products"""
    token = create_token(regular_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.delete(f"/products/{product.id}", headers=headers)

    # Should fail with permission error
    assert response.status_code == 403

    # Verify it still exists in the database
    product_exists = await Product.filter(id=product.id).exists()
    assert product_exists


@pytest.mark.anyio
async def test_non_member_cannot_access_products(client: AsyncClient, non_member_user, organization, product):
    """Test that non-members cannot access organization products"""
    token = create_token(non_member_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Try to get product list
    response = await client.get(
        "/products/",
        params={"organization_id": str(organization.id)},
        headers=headers
    )

    # Should fail with permission error
    assert response.status_code == 403

    # Try to get specific product
    response = await client.get(
        f"/products/{product.id}",
        params={"organization_id": str(organization.id)},
        headers=headers
    )

    # Should fail with permission error
    assert response.status_code == 403
