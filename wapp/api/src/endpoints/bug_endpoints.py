from fastapi import APIRouter
from dto.schemas import BugCreate as BugCreateSchema, Bug as BugSchema
from services.bug_services import (
    get_bug,
    create_bug,
    get_all_bugs,
    delete_bug,
    get_bugs_by_test_execution,
    get_bugs_by_product_id
)
from pydantic import UUID4
from typing import List


router = APIRouter(prefix="/bugs", tags=["bugs"])


@router.get("/")
async def get_all_bugs_endpoint() -> List[BugSchema]:
    return await get_all_bugs()


@router.get("/by-product/{product_id}")
async def get_bugs_by_product_id_endpoint(product_id: UUID4) -> List[BugSchema]:
    """
    Get all bugs related to a product with the given ID.

    Args:
        product_id: The UUID of the product

    Returns:
        A list of bugs for the specified product, or an empty list if no product matches
    """
    return await get_bugs_by_product_id(product_id)


@router.get("/by-test-execution/{test_execution_id}")
async def get_bugs_by_test_execution_endpoint(test_execution_id: UUID4) -> List[BugSchema]:
    """
    Get all bugs discovered during a specific test execution.

    Args:
        test_execution_id: UUID of the test execution

    Returns:
        A list of bugs discovered during the specified test execution
    """
    return await get_bugs_by_test_execution(test_execution_id)


@router.get("/{bug_id}")
async def get_bug_endpoint(bug_id: UUID4) -> BugSchema:
    return await get_bug(bug_id)


@router.post("/")
async def create_bug_endpoint(bug: BugCreateSchema) -> BugSchema:
    return await create_bug(bug)


@router.delete("/{bug_id}")
async def delete_bug_endpoint(bug_id: UUID4) -> dict:
    """Delete a bug."""
    deleted = await delete_bug(bug_id)
    return {"success": deleted, "message": "Bug deleted successfully"}
