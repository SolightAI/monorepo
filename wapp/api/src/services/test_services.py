from fastapi import HTTPException
from dto.models import Test as TestModel, Product as ProductModel
from dto.schemas import TestCreate as TestCreateSchema, TestStatus
from typing import List, Optional
from uuid import UUID
from services.product_services import get_product_by_url_path


async def get_test(test_id: UUID) -> TestModel:
    test = await TestModel.get_or_none(id=test_id).prefetch_related("bugs")

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    return test


async def get_all_tests() -> List[TestModel]:
    tests = await TestModel.all().prefetch_related("bugs")
    return tests


async def get_tests_by_product_path(url_path: str) -> List[TestModel]:
    """
    Get tests related to a product with the given URL path.
    
    This traverses the relationship hierarchy:
    Product -> Epics -> Features -> UserStories -> AcceptanceCriteria -> Tests
    
    Args:
        url_path: The URL path segment to match against product URLs
        
    Returns:
        A list of tests related to the matched product, or an empty list if no product matches
    """
    # Get the product by URL path
    product = await get_product_by_url_path(url_path)
    
    if not product:
        return []
    
    # Prefetch related objects
    await product.fetch_related("epics")
    
    # Collect all tests
    tests = []
    
    # Traverse the relationship hierarchy
    for epic in product.epics:
        await epic.fetch_related("features")
        for feature in epic.features:
            await feature.fetch_related("user_stories")
            for user_story in feature.user_stories:
                await user_story.fetch_related("acceptance_criteria")
                for acceptance_criteria in user_story.acceptance_criteria:
                    await acceptance_criteria.fetch_related("tests")
                    tests.extend(acceptance_criteria.tests)
    
    # Fetch bugs for each test
    for test in tests:
        await test.fetch_related("bugs")
    
    return tests


async def create_test(test: TestCreateSchema) -> TestModel:
    test_model = await TestModel.create(**test.model_dump())

    return await get_test(test_model.id)  # NOTE: a bit dirty, but it works (prevents issue with ManyToManyField)


async def update_test_status(test_id: str | UUID, status: TestStatus) -> TestModel:
    test = await TestModel.get_or_none(id=test_id)

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    test.status = status
    await test.save()
    return test
