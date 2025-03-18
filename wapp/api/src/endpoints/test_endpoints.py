from fastapi import APIRouter, Body, BackgroundTasks, Depends, HTTPException, status
from dto.schemas import TestCreate as TestCreateSchema, Test as TestSchema, TestStatus, TestUpdate as TestUpdateSchema, TestSecretCreate, TestSecret, TestExecution as TestExecutionSchema
from services.test_services import (
    get_test,
    create_test,
    get_all_tests,
    update_test_status,
    get_tests_by_product_path,
    delete_test,
    update_test,
    trigger_test_generation,
    get_test_generation_status,
    poll_test_generation_status,
    add_test_secret,
    get_test_secrets,
    delete_test_secret,
)
from services.test_execution_services import get_test_executions_by_test
from pydantic import UUID4
from typing import List

from dependencies import get_current_user
from dto.models import User
from services import organization_services, secret_services
from logging import getLogger


router = APIRouter(prefix="/tests", tags=["tests"])
logger = getLogger(__name__)


@router.get("/")
async def get_all_tests_endpoint() -> List[TestSchema]:
    return await get_all_tests()


@router.get("/by-product-path/{url_path}")
async def get_tests_by_product_path_endpoint(url_path: str) -> List[TestSchema]:
    """
    Get all tests related to a product that matches the given URL path.

    Args:
        url_path: The URL path segment to match against product URLs

    Returns:
        A list of tests for the matched product, or an empty list if no product matches
    """
    return await get_tests_by_product_path(url_path)


@router.get("/{test_id}")
async def get_test_endpoint(test_id: UUID4) -> TestSchema:
    return await get_test(test_id)


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
    return await create_test(test)


@router.put("/{test_id}/status")
async def update_test_status_endpoint(
    test_id: UUID4, status: TestStatus = Body(..., embed=True)
) -> TestSchema:
    await update_test_status(test_id, status)
    return await get_test(test_id)


@router.put("/{test_id}")
async def update_test_endpoint(test_id: UUID4, test_update: TestUpdateSchema) -> TestSchema:
    """Update a test with the provided data."""
    return await update_test(test_id, test_update)


@router.delete("/{test_id}")
async def delete_test_endpoint(test_id: UUID4) -> dict:
    """Delete a test and all its related bugs."""
    deleted = await delete_test(test_id)
    return {"success": deleted, "message": "Test and all related bugs deleted successfully"}


@router.post("/generate")
async def generate_test(acceptance_criteria_id: UUID4, background_tasks: BackgroundTasks) -> str:  # returns task id

    task_id = await trigger_test_generation(acceptance_criteria_id=acceptance_criteria_id)
    background_tasks.add_task(poll_test_generation_status, task_id)  # temporary disabled
    logger.error(f"Test generation task {task_id} started")
    return task_id


@router.get("/generate/status/{task_id}")
async def get_generate_test_status_endpoint(task_id: UUID4) -> dict:
    return await get_test_generation_status(task_id)


@router.post("/{test_id}/secrets", response_model=TestSecret, status_code=status.HTTP_201_CREATED)
async def add_test_secret_endpoint(
    test_id: UUID4,
    data: TestSecretCreate,
    current_user: User = Depends(get_current_user),
) -> TestSecret:
    """
    Add a secret to a test.

    This endpoint allows associating a secret with a test, which can be used
    for authentication or other sensitive data needed for test execution.
    """
    # Verify user has access to the test and the secret by checking organization membership
    test = await get_test(test_id)
    await test.fetch_related("acceptance_criteria__user_story__feature__epic__product__organization")
    org = test.acceptance_criteria.user_story.feature.epic.product.organization

    # Check if user has access to the organization
    await organization_services.verify_user_in_organization(current_user.id, org.id)

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
    current_user: User = Depends(get_current_user),
) -> List[TestSecret]:
    """
    Get all secrets associated with a test.

    This endpoint returns the list of secrets that have been associated with the test
    for use during test execution.
    """
    # Verify user has access to the test by checking organization membership
    test = await get_test(test_id)
    await test.fetch_related("acceptance_criteria__user_story__feature__epic__product__organization")
    org = test.acceptance_criteria.user_story.feature.epic.product.organization

    # Check if user has access to the organization
    await organization_services.verify_user_in_organization(current_user.id, org.id)

    # Verify this is a valid organization member request
    member = await organization_services.get_organization_member(current_user.id, org.id)
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
    current_user: User = Depends(get_current_user),
):
    """
    Remove a secret from a test.

    This endpoint disassociates a secret from a test when it's no longer needed.
    """
    # Verify user has access to the test by checking organization membership
    test = await get_test(test_id)
    await test.fetch_related("acceptance_criteria__user_story__feature__epic__product__organization")
    org = test.acceptance_criteria.user_story.feature.epic.product.organization

    # Verify user has admin access to the organization
    member = await organization_services.get_organization_member(current_user.id, org.id)
    if not member or member.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be an owner or admin to remove test secrets",
        )

    await delete_test_secret(test_id, secret_id)
