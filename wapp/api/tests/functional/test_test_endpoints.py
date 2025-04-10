import pytest
from uuid import uuid4
from httpx import AsyncClient
from dto.models import Test, Secret, TestSecret, AcceptanceCriteria, TestExecution
from dto.schemas import TestStatus, SecretType, TestCategory, ExecutorType
from ..conftest import create_token


@pytest.fixture
async def acceptance_criteria(test_feature):
    """Create a test acceptance criteria"""
    ac = await AcceptanceCriteria.create(
        id=uuid4(),
        title="Test Acceptance Criteria",
        name="Test Acceptance Criteria",
        description="Acceptance criteria for testing",
        feature=test_feature
    )

    yield ac
    await ac.delete()


@pytest.fixture
async def test_case(test_feature, acceptance_criteria):
    """Create a test case"""
    test_case = await Test.create(
        id=uuid4(),
        name="Test Case",
        description="A test case for testing endpoints",
        feature=test_feature,
        acceptance_criteria=acceptance_criteria,
        status=TestStatus.PASSED,
        tags=["test", "example"],
        url="https://example.com/test-case",
        category=TestCategory.SMOKE,
        preconditions="",
        steps="",
        assertions=""
    )

    yield test_case
    await test_case.delete()


@pytest.fixture
async def organization_secret(test_organization, admin_user):
    """Create a secret for the organization"""
    secret = await Secret.create(
        id=uuid4(),
        name="Test API Key",
        value="api_key_123456",
        type=SecretType.API_KEY,
        organization=test_organization,
        created_by=admin_user
    )

    yield secret
    await secret.delete()


# Test basic CRUD operations with admin user
@pytest.mark.anyio
async def test_create_test(client: AsyncClient, admin_user, test_feature, acceptance_criteria):
    """Test creating a new test"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    data = {
        "name": "New Test Case",
        "description": "A test created through the API",
        "feature_id": str(test_feature.id),
        "url": "https://example.com/new-test",
        "category": TestCategory.SMOKE,
        "preconditions": "System is in a stable state",
        "steps": "1. Navigate to the page\n2. Click the button",
        "assertions": "assert result == expected"
    }

    response = await client.post(
        "/tests/",
        json=data,
        headers=headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["name"] == data["name"]
    assert result["description"] == data["description"]
    assert result["feature_id"] == data["feature_id"]
    assert result["url"] == data["url"]
    assert result["category"] == data["category"]
    assert result["preconditions"] == data["preconditions"]
    assert result["steps"] == data["steps"]
    assert result["assertions"] == data["assertions"]

    # Cleanup
    test_id = result["id"]
    test = await Test.get(id=test_id)
    await test.delete()


@pytest.mark.anyio
async def test_get_test(client: AsyncClient, admin_user, test_case):
    """Test getting a test by ID"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.get(
        f"/tests/{test_case.id}",
        headers=headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["id"] == str(test_case.id)
    assert result["name"] == test_case.name
    assert result["description"] == test_case.description


@pytest.mark.anyio
async def test_get_all_tests(client: AsyncClient, admin_user, test_case):
    """Test getting all tests"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.get(
        "/tests/",
        headers=headers
    )

    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    assert len(results) >= 1  # At least our test case should be present

    # Find our test in the results
    found = False
    for test in results:
        if test["id"] == str(test_case.id):
            found = True
            break

    assert found, "Test case not found in results"


@pytest.mark.anyio
async def test_get_tests_by_feature(client: AsyncClient, admin_user, test_feature, test_case):
    """Test getting tests for a specific feature"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.get(
        f"/tests/by-feature/{test_feature.id}",
        headers=headers
    )

    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    assert len(results) >= 1  # At least our test case should be present

    # Find our test in the results
    found = False
    for test in results:
        if test["id"] == str(test_case.id):
            found = True
            break

    assert found, "Test case not found in feature's tests"


@pytest.mark.anyio
async def test_get_tests_by_product(client: AsyncClient, admin_user, test_product, test_case):
    """Test getting tests for a specific product"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    response = await client.get(
        f"/tests/by-product/{test_product.id}",
        headers=headers
    )

    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    assert len(results) >= 1  # At least our test case should be present

    # Find our test in the results
    found = False
    for test in results:
        if test["id"] == str(test_case.id):
            found = True
            break

    assert found, "Test case not found in product's tests"


@pytest.mark.anyio
async def test_update_test_status(client: AsyncClient, admin_user, test_case):
    """Test updating a test's status"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    data = {
        "status": "PASSED"
    }

    response = await client.put(
        f"/tests/{test_case.id}/status",
        json=data,
        headers=headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["id"] == str(test_case.id)
    assert result["status"] == data["status"]


@pytest.mark.anyio
async def test_update_test(client: AsyncClient, admin_user, test_case):
    """Test updating a test"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    data = {
        "name": "Updated Test Name",
        "description": "Updated test description",
        "url": "https://example.com/updated-test",
        "category": "INTEGRATION"
    }

    response = await client.put(
        f"/tests/{test_case.id}",
        json=data,
        headers=headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["id"] == str(test_case.id)
    assert result["name"] == data["name"]
    assert result["description"] == data["description"]
    assert result["url"] == data["url"]
    assert result["category"] == data["category"]


@pytest.mark.anyio
async def test_delete_test(client: AsyncClient, admin_user, test_feature, acceptance_criteria):
    """Test deleting a test"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Create a new test to delete
    test_to_delete = await Test.create(
        id=uuid4(),
        name="Test to Delete",
        description="This test will be deleted",
        feature=test_feature,
        acceptance_criteria=acceptance_criteria,
        status=TestStatus.PASSED,
        tags=["delete", "test"],
        url="https://example.com/test-to-delete",
        category=TestCategory.SMOKE,
        preconditions="",
        steps="",
        assertions=""
    )

    response = await client.delete(
        f"/tests/{test_to_delete.id}",
        headers=headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["success"] is True

    # Verify the test is deleted
    test_exists = await Test.filter(id=test_to_delete.id).exists()
    assert not test_exists


@pytest.mark.anyio
async def test_add_test_secret(client: AsyncClient, admin_user, test_case, organization_secret):
    """Test adding a secret to a test"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    data = {
        "test_id": str(test_case.id),
        "secret_id": str(organization_secret.id)
    }

    response = await client.post(
        f"/tests/{test_case.id}/secrets",
        json=data,
        headers=headers
    )

    assert response.status_code == 201
    result = response.json()
    assert result["test_id"] == str(test_case.id)
    assert result["secret_id"] == str(organization_secret.id)

    # Cleanup
    test_secret = await TestSecret.get(test_id=test_case.id, secret_id=organization_secret.id)
    await test_secret.delete()


@pytest.mark.anyio
async def test_get_test_secrets(client: AsyncClient, admin_user, test_case, organization_secret):
    """Test getting secrets for a test"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # First add a secret
    await TestSecret.create(
        test=test_case,
        secret=organization_secret
    )

    response = await client.get(
        f"/tests/{test_case.id}/secrets",
        headers=headers
    )

    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    assert len(results) >= 1

    # Find our secret in the results
    found = False
    for secret in results:
        if secret["secret_id"] == str(organization_secret.id):
            found = True
            break

    assert found, "Test secret not found in results"

    # Cleanup
    test_secret = await TestSecret.get(test_id=test_case.id, secret_id=organization_secret.id)
    await test_secret.delete()


@pytest.mark.anyio
async def test_delete_test_secret(client: AsyncClient, admin_user, test_case, organization_secret):
    """Test deleting a secret from a test"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Ensure IDs are properly stored as strings
    test_id = str(test_case.id)
    secret_id = str(organization_secret.id)

    # First add a secret (using string IDs)
    await TestSecret.create(
        test_id=test_id,
        secret_id=secret_id
    )

    response = await client.delete(
        f"/tests/{test_id}/secrets/{secret_id}",
        headers=headers
    )

    assert response.status_code == 204

    # Verify the association is deleted
    test_secret_exists = await TestSecret.filter(
        test_id=test_id,
        secret_id=secret_id
    ).exists()

    assert not test_secret_exists


@pytest.mark.anyio
async def test_get_test_executions(client: AsyncClient, admin_user, test_case):
    """Test getting executions for a test"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Create a test execution
    execution = await TestExecution.create(
        id=uuid4(),
        test=test_case,
        output="Test output",
        status=TestStatus.PASSED,
        execution_time=1.5,
        environment="test",
        executor_type=ExecutorType.MANUAL
    )

    response = await client.get(
        f"/tests/{test_case.id}/executions",
        headers=headers
    )

    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    assert len(results) >= 1

    # Find our execution in the results
    found = False
    for result in results:
        if result["id"] == str(execution.id):
            found = True
            break

    assert found, "Test execution not found in results"

    # Cleanup
    await execution.delete()


# Permission tests
@pytest.mark.xfail(reason="Need to fix the codebase")  # FIXME
@pytest.mark.anyio
async def test_member_can_view_but_not_delete_test(client: AsyncClient, organization_member, test_case):
    """Test that a member can view but not delete tests"""
    token = create_token(organization_member.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Should be able to view
    view_response = await client.get(
        f"/tests/{test_case.id}",
        headers=headers
    )
    assert view_response.status_code == 200

    # Should not be able to delete
    delete_response = await client.delete(
        f"/tests/{test_case.id}",
        headers=headers
    )
    assert delete_response.status_code == 403  # Forbidden


@pytest.mark.xfail(reason="Need to fix the codebase")  # FIXME
@pytest.mark.anyio
async def test_guest_cannot_add_test_secret(client: AsyncClient, organization_guest, test_case, organization_secret):
    """Test that a guest cannot add secrets to tests"""
    token = create_token(organization_guest.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    data = {
        "test_id": str(test_case.id),
        "secret_id": str(organization_secret.id)
    }

    response = await client.post(
        f"/tests/{test_case.id}/secrets",
        json=data,
        headers=headers
    )

    assert response.status_code == 403  # Forbidden
