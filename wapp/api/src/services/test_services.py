from fastapi import HTTPException
from dto.models import Test as TestModel
from dto.schemas import TestCreate as TestCreateSchema, TestStatus
from typing import List
from uuid import UUID


async def get_test(test_id: UUID) -> TestModel:
    test = await TestModel.get_or_none(id=test_id).prefetch_related("bugs")

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    return test


async def get_all_tests() -> List[TestModel]:
    tests = await TestModel.all().prefetch_related("bugs")
    return tests


async def create_test(test: TestCreateSchema) -> TestModel:
    test_model = await TestModel.create(**test.model_dump())

    return await get_test(test_model.id)  # NOTE: a bit dirty, but it works (prevents issue with ManyToManyField)


async def update_test_status(test_id: str, status: TestStatus) -> TestModel:
    test = await TestModel.get_or_none(id=test_id)

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    test.status = status
    await test.save()
    return test
