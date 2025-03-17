from fastapi import APIRouter, Body, BackgroundTasks, Depends, HTTPException, status
from dto.schemas import TestCreate as TestCreateSchema, Test as TestSchema, TestStatus, TestUpdate as TestUpdateSchema, TestSecretCreate, TestSecret
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
    
    Args:
        test_id: ID of the test
        data: Secret data to add

    Returns:
        The created test-secret relationship
    """
    # Verify the test exists
    test = await get_test(test_id)

    # Verify the secret exists
    await secret_services.get_secret(data.secret_id)

    # Check permissions by traversing the hierarchy
    await test.fetch_related("acceptance_criteria__user_story__feature__epic__product__organization")
    organization = test.acceptance_criteria.user_story.feature.epic.product.organization
    
    # Verify the user has access to the organization
    member = await organization_services.get_organization_member(
        organization.id, current_user.id
    )
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this test"
        )
    
    # Create the test-secret relationship
    test_secret = await add_test_secret(test_id, data.secret_id)
    
    return test_secret


@router.get("/{test_id}/secrets", response_model=List[TestSecret])
async def get_test_secrets_endpoint(
    test_id: UUID4,
    current_user: User = Depends(get_current_user),
) -> List[TestSecret]:
    """
    Get all secrets associated with a test.
    
    Args:
        test_id: ID of the test
        
    Returns:
        List of test-secret relationships
    """
    # Verify the test exists
    test = await get_test(test_id)
    
    # Check permissions by traversing the hierarchy
    await test.fetch_related("acceptance_criteria__user_story__feature__epic__product__organization")
    organization = test.acceptance_criteria.user_story.feature.epic.product.organization
    
    # Verify the user has access to the organization
    member = await organization_services.get_organization_member(
        organization.id, current_user.id
    )
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this test"
        )
    
    # Get the test secrets
    test_secrets = await get_test_secrets(test_id)
    
    return test_secrets


@router.delete("/{test_id}/secrets/{secret_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test_secret_endpoint(
    test_id: UUID4,
    secret_id: UUID4,
    current_user: User = Depends(get_current_user),
):
    """
    Remove a secret from a test.
    
    Args:
        test_id: ID of the test
        secret_id: ID of the secret to remove
    """
    # Verify the test exists
    test = await get_test(test_id)
    
    # Check permissions by traversing the hierarchy
    await test.fetch_related("acceptance_criteria__user_story__feature__epic__product__organization")
    organization = test.acceptance_criteria.user_story.feature.epic.product.organization
    
    # Verify the user has access to the organization
    member = await organization_services.get_organization_member(
        organization.id, current_user.id
    )
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this test"
        )
    
    # Delete the test-secret relationship
    await delete_test_secret(test_id, secret_id)
