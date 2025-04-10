import pytest
from uuid import uuid4
from httpx import AsyncClient
from dto.models import Test, TestExecution
from dto.schemas import TestStatus, ExecutorType, TestCategory

from ..conftest import create_token


@pytest.mark.anyio
async def test_get_test_execution(client: AsyncClient, admin_user, test_case):
    """Test getting a test execution by ID"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Create a test execution
    execution = await TestExecution.create(
        id=uuid4(),
        test=test_case,
        status=TestStatus.PASSED,
        environment="test",
        executor_type=ExecutorType.MANUAL,
        notes="Test execution passed successfully"
    )

    response = await client.get(
        f"/test-executions/{execution.id}",
        headers=headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["id"] == str(execution.id)
    assert result["status"] == TestStatus.PASSED
    assert result["environment"] == "test"
    assert result["executor_type"] == ExecutorType.MANUAL
    assert result["notes"] == "Test execution passed successfully"

    # Cleanup
    await execution.delete()


@pytest.mark.anyio
async def test_get_test_executions_by_test(client: AsyncClient, admin_user, test_case):
    """Test getting all executions for a specific test"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Create a test execution
    execution = await TestExecution.create(
        id=uuid4(),
        test=test_case,
        status=TestStatus.PASSED,
        environment="test",
        executor_type=ExecutorType.MANUAL
    )

    response = await client.get(
        f"/test-executions/by-test/{test_case.id}",
        headers=headers
    )

    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    assert len(results) >= 1  # At least our execution should be present

    # Find our execution in the results
    found = False
    for result in results:
        if result["id"] == str(execution.id):
            found = True
            break

    assert found, "Test execution not found in results"
    assert "environment" in results[0], "Environment field should be present"
    assert "executor_type" in results[0], "Executor type field should be present"

    # Cleanup
    await execution.delete()


@pytest.mark.anyio
async def test_create_failed_test_execution(client: AsyncClient, admin_user, test_feature):
    """Test creating a failed test execution and verify it can handle severity estimation"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}
    
    # Create a test case related to login (which should have high severity when failing)
    login_test = await Test.create(
        id=uuid4(),
        name="Login Test",
        description="Test user login functionality",
        feature=test_feature,
        status=TestStatus.NOT_STARTED,
        url="https://example.com/login",
        category=TestCategory.SMOKE,
        preconditions="User has an account",
        steps="1. Enter username\n2. Enter password\n3. Click login button",
        expected_results="User should be logged in successfully",
        assertions="assert user is logged in"
    )
    
    # Create execution data for a failed test
    execution_data = {
        "test_id": str(login_test.id),
        "status": TestStatus.FAILED,
        "environment": "production",
        "executor_type": ExecutorType.MANUAL,
        "notes": "Authentication failed. User unable to log in."
    }
    
    response = await client.post(
        "/test-executions/",
        json=execution_data,
        headers=headers
    )
    
    assert response.status_code == 201
    result = response.json()
    assert result["test_id"] == str(login_test.id)
    assert result["status"] == TestStatus.FAILED
    assert result["environment"] == "production"
    assert result["notes"] == "Authentication failed. User unable to log in."
    
    # Verify the test status was updated
    updated_test = await Test.get(id=login_test.id)
    assert updated_test.status == TestStatus.FAILED
    
    # Cleanup
    execution_id = result["id"]
    execution = await TestExecution.get(id=execution_id)
    await execution.delete()
    await login_test.delete()


@pytest.mark.anyio
async def test_create_low_severity_failed_test(client: AsyncClient, admin_user, test_feature):
    """Test creating a failed test execution for a low-severity feature"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}
    
    # Create a test case related to a UI element (which should have lower severity when failing)
    ui_test = await Test.create(
        id=uuid4(),
        name="Footer Links Test",
        description="Test footer links navigation",
        feature=test_feature,
        status=TestStatus.NOT_STARTED,
        url="https://example.com/home",
        category=TestCategory.SMOKE,
        preconditions="User is on home page",
        steps="1. Scroll to footer\n2. Click on 'About Us' link",
        expected_results="User should be redirected to About Us page",
        assertions="assert current page is about-us"
    )
    
    # Create execution data for a failed test
    execution_data = {
        "test_id": str(ui_test.id),
        "status": TestStatus.FAILED,
        "environment": "staging",
        "executor_type": ExecutorType.MANUAL,
        "notes": "Footer link has incorrect styling. Color is wrong."
    }
    
    response = await client.post(
        "/test-executions/",
        json=execution_data,
        headers=headers
    )
    
    assert response.status_code == 201
    result = response.json()
    assert result["test_id"] == str(ui_test.id)
    assert result["status"] == TestStatus.FAILED
    assert result["environment"] == "staging"
    
    # Cleanup
    execution_id = result["id"]
    execution = await TestExecution.get(id=execution_id)
    await execution.delete()
    await ui_test.delete()


@pytest.mark.anyio
async def test_update_test_execution(client: AsyncClient, admin_user, test_case):
    """Test updating a test execution"""
    token = create_token(admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}

    # Create a test execution
    execution = await TestExecution.create(
        id=uuid4(),
        test=test_case,
        status=TestStatus.PENDING,
        environment="test",
        executor_type=ExecutorType.MANUAL
    )

    # Update the execution
    update_data = {
        "status": TestStatus.PASSED,
        "notes": "Test completed successfully"
    }

    response = await client.put(
        f"/test-executions/{execution.id}",
        json=update_data,
        headers=headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["id"] == str(execution.id)
    assert result["status"] == TestStatus.PASSED
    assert result["notes"] == "Test completed successfully"

    # Verify the test status was updated
    updated_test = await Test.get(id=test_case.id)
    assert updated_test.status == TestStatus.PASSED

    # Cleanup
    await execution.delete() 