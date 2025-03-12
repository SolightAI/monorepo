from fastapi import APIRouter
from dto.schemas import BugCreate as BugCreateSchema, Bug as BugSchema
from services.bug_services import get_bug, create_bug, get_all_bugs, get_bugs_by_product_path, delete_bug
from pydantic import UUID4
from typing import List


router = APIRouter(prefix="/bugs", tags=["bugs"])


@router.get("/")
async def get_all_bugs_endpoint() -> List[BugSchema]:
    return await get_all_bugs()


@router.get("/by-product-path/{url_path}")
async def get_bugs_by_product_path_endpoint(url_path: str) -> List[BugSchema]:
    """
    Get all bugs related to a product that matches the given URL path.
    
    Args:
        url_path: The URL path segment to match against product URLs
        
    Returns:
        A list of bugs for the matched product, or an empty list if no product matches
    """
    return await get_bugs_by_product_path(url_path)


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
