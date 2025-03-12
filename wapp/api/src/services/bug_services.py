from fastapi import HTTPException
from dto.models import Bug as BugModel
from dto.schemas import BugCreate as BugCreateSchema
from typing import List
from uuid import UUID
from services.test_services import get_tests_by_product_path


async def get_bug(bug_id: str | UUID) -> BugModel:
    bug = await BugModel.get_or_none(id=bug_id)

    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")

    return bug


async def get_all_bugs() -> List[BugModel]:
    bugs = await BugModel.all().prefetch_related("test")
    return bugs


async def get_bugs_by_product_path(url_path: str) -> List[BugModel]:
    """
    Get bugs related to a product with the given URL path.

    This uses the test-product relationship via:
    Tests by product -> Bugs by tests

    Args:
        url_path: The URL path segment to match against product URLs

    Returns:
        A list of bugs related to the product, or an empty list if no product matches
    """
    # Get tests related to the product
    tests = await get_tests_by_product_path(url_path)

    if not tests:
        return []

    # Collect all bugs from these tests
    bugs = []
    for test in tests:
        await test.fetch_related("bugs")
        bugs.extend(test.bugs)

    return bugs


async def create_bug(bug: BugCreateSchema) -> BugModel:
    bug_model = await BugModel.create(**bug.model_dump())

    return await get_bug(bug_model.id)  # NOTE: a bit dirty, but it works (prevents issue with ManyToManyField)


async def delete_bug(bug_id: str | UUID) -> bool:
    """
    Delete a bug.
    
    Args:
        bug_id: UUID of the bug to delete
        
    Returns:
        True if the bug was deleted, False otherwise
        
    Raises:
        HTTPException: If the bug was not found
    """
    bug = await BugModel.get_or_none(id=bug_id)
    
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")
    
    # Delete the bug
    await bug.delete()
    
    return True
