from fastapi import HTTPException
from dto.models import Test as TestModel
from dto.schemas import Test as TestSchema, TestCreate as TestCreateSchema, TestStatus
from typing import List


async def get_test(test_id: str) -> TestSchema:
    test = await TestModel.get_or_none(id=test_id).prefetch_related("bugs")

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    return test


async def get_all_tests() -> List[TestSchema]:
    tests = await TestModel.all().prefetch_related("bugs")
    return tests


async def create_test(test: TestCreateSchema) -> TestSchema:
    test_model = await TestModel.create(**test.model_dump())

    return await get_test(test_model.id)  # NOTE: a bit dirty, but it works (prevents issue with ManyToManyField)


async def update_test_status(test_id: str, status: TestStatus) -> TestSchema:
    test = await TestModel.get_or_none(id=test_id)

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    test.status = status
    await test.save()
    return test
