from fastapi import APIRouter, Body
from dto.schemas import TestCreate as TestCreateSchema, Test as TestSchema, TestStatus
from services.test_services import get_test, create_test, get_all_tests, update_test_status, get_tests_by_product_path, delete_test
from pydantic import UUID4
from typing import List


router = APIRouter(prefix="/tests", tags=["tests"])


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


@router.delete("/{test_id}")
async def delete_test_endpoint(test_id: UUID4) -> dict:
    """Delete a test and all its related bugs."""
    deleted = await delete_test(test_id)
    return {"success": deleted, "message": "Test and all related bugs deleted successfully"}
