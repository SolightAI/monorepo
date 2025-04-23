from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from dto.schemas import TestCreate as TestCreateSchema, Test as TestSchema, TestUpdate as TestUpdateSchema, TestSecretCreate, TestSecret, TestExecution as TestExecutionSchema
from services.test_execution_services import get_test_executions_by_test
from services.test_services import (
    get_test,
    create_test,
    get_all_tests,
    get_tests_by_feature,
    delete_test,
    update_test,
    trigger_test_generation,
    get_test_generation_status,
    poll_test_generation_status,
    add_test_secret,
    get_test_secrets,
    delete_test_secret,
    get_tests_by_product_id,
    get_feature,
    get_epic,
    get_product,
    get_generations,
)
from pydantic import UUID4
from typing import List

from dependencies import get_current_user_dependency
from dto.models import User
from services import organization_services, secret_services
from logging import getLogger


router = APIRouter(prefix="/tests", tags=["tests"])
logger = getLogger(__name__)


@router.get("/")
async def get_all_tests_endpoint() -> List[TestSchema]:
    return await get_all_tests()


@router.get("/by-product/{product_id}")
async def get_tests_by_product_id_endpoint(product_id: UUID4) -> List[TestSchema]:
    """
    Get all tests related to a product by its ID.

    Args:
        product_id: The UUID of the product

    Returns:
        A list of tests for the product, or an empty list if no product found
    """
    return await get_tests_by_product_id(product_id)


@router.get("/by-feature/{feature_id}")
async def get_tests_by_feature_endpoint(feature_id: UUID4) -> List[TestSchema]:
    """
    Get all tests for a feature.

    Args:
        feature_id: UUID of the feature

    Returns:
        A list of tests for the feature
    """
    return await get_tests_by_feature(feature_id)


@router.get("/{test_id}")
async def get_test_endpoint(test_id: UUID4) -> TestSchema:
    return (await get_test(test_id)).to_schema()


@router.get("/{test_id}/executions")
async def get_test_executions_endpoint(test_id: UUID4) -> List[TestExecutionSchema]:
    """
    Get the execution history for a specific test.

    Returns a chronological list of all test executions for this test,
    providing a complete history of test runs.
    """
    return await get_test_executions_by_test(test_id)


@router.post("/")
async def create_test_endpoint(test: TestCreateSchema) -> TestSchema:
    return (await create_test(test)).to_schema()


@router.put("/{test_id}")
async def update_test_endpoint(test_id: UUID4, test_update: TestUpdateSchema) -> TestSchema:
    """Update a test with the provided data."""
    return (await update_test(test_id, test_update)).to_schema()


@router.delete("/{test_id}")
async def delete_test_endpoint(test_id: UUID4) -> dict:
    """Delete a test."""
    deleted = await delete_test(test_id)
    return {"success": deleted, "message": "Test deleted successfully"}


@router.post("/generate")
async def generate_test(
    feature_id: UUID4,
    current_user: User = Depends(get_current_user_dependency),
    background_tasks: BackgroundTasks = BackgroundTasks()
) -> dict:
    """
    Generate tests for a feature.

    Args:
        feature_id: The ID of the feature to generate tests for
        current_user: The current authenticated user

    Returns:
        A dictionary containing the task ID and feature ID
    """
    try:
        # Verify the feature exists and user has access
        feature = await get_feature(feature_id)
        if not feature:
            raise HTTPException(status_code=404, detail="Feature not found")

        # Get the epic and product to verify organization access
        epic = await get_epic(feature.epic_id)
        product = await get_product(epic.product_id)

        # Verify user has access to the organization
        if not await organization_services.verify_organization_access(product.organization_id, current_user.id):
            raise HTTPException(status_code=403, detail="Access denied to organization")

        # Trigger test generation
        response_data = await trigger_test_generation(feature_id=feature_id)
        background_tasks.add_task(
            poll_test_generation_status,
            task_id=response_data["task_id"],
        )
        return response_data

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error generating tests: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating tests: {str(e)}")


@router.get("/generate/status/{task_id}")
async def get_generate_test_status_endpoint(task_id: UUID4) -> dict:
    """
    Get the status of a test generation task.

    Args:
        task_id: The ID of the test generation task

    Returns:
        A dictionary containing the status of the task and any results if completed
    """
    return await get_test_generation_status(task_id)


@router.post("/{test_id}/secrets", response_model=TestSecret, status_code=status.HTTP_201_CREATED)
async def add_test_secret_endpoint(
    test_id: UUID4,
    data: TestSecretCreate,
    current_user: User = Depends(get_current_user_dependency),
) -> TestSecret:
    """
    Add a secret to a test.

    This endpoint allows associating a secret with a test, which can be used
    for authentication or other sensitive data needed for test execution.
    """
    # Verify user has access to the test and the secret by checking organization membership
    test = await get_test(test_id)
    await test.fetch_related("feature__epic__product__organization")
    org = test.feature.epic.product.organization

    # Check if user has access to the organization
    member = await organization_services.get_organization_member(org.id, current_user.id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of the organization to add test secrets",
        )

    # Get the secret to verify it belongs to the same organization
    secret = await secret_services.get_secret(data.secret_id)
    if str(secret.organization_id) != str(org.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Secret and test must belong to the same organization",
        )

    return await add_test_secret(test_id, data.secret_id)


@router.get("/{test_id}/secrets", response_model=List[TestSecret])
async def get_test_secrets_endpoint(
    test_id: UUID4,
    current_user: User = Depends(get_current_user_dependency),
) -> List[TestSecret]:
    """
    Get all secrets associated with a test.

    This endpoint returns the list of secrets that have been associated with the test
    for use during test execution.
    """
    # Verify user has access to the test by checking organization membership
    test = await get_test(test_id)
    await test.fetch_related("feature__epic__product__organization")
    org = test.feature.epic.product.organization

    # Check if user has access to the organization
    member = await organization_services.get_organization_member(org.id, current_user.id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of the organization to view test secrets",
        )

    # Track access to these secrets for audit purposes
    # We'll add this later when we log test executions

    return await get_test_secrets(test_id)


@router.delete("/{test_id}/secrets/{secret_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test_secret_endpoint(
    test_id: UUID4,
    secret_id: UUID4,
    current_user: User = Depends(get_current_user_dependency),
) -> None:
    """
    Remove a secret from a test.

    This endpoint disassociates a secret from a test when it's no longer needed.
    """
    # Verify user has access to the test by checking organization membership
    test = await get_test(test_id)
    await test.fetch_related("feature__epic__product__organization")
    org = test.feature.epic.product.organization

    # Verify user has admin access to the organization
    member = await organization_services.get_organization_member(org.id, current_user.id)
    if not member or member.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be an owner or admin to remove test secrets",
        )

    await delete_test_secret(test_id, secret_id)


@router.get("/generate/{feature_id}")
async def get_test_generation_task_id_endpoint(feature_id: UUID4) -> dict:
    """
    Get the task ID for test generation of a feature from Redis.
    
    Args:
        feature_id: The ID of the feature
        
    Returns:
        A dictionary containing the task ID or None if not found
    """
    task_id = await get_generations(str(feature_id))
    return {"task_id": task_id}
