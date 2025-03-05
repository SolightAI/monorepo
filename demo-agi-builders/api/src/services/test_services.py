from fastapi import HTTPException
from dto.models import Test as TestModel
from dto.schemas import Test as TestSchema, TestCreate as TestCreateSchema


async def get_test(test_id: str) -> TestSchema:
    test = await TestModel.get_or_none(id=test_id).prefetch_related("bugs")

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    return test


async def create_test(test: TestCreateSchema) -> TestSchema:
    test_model = await TestModel.create(**test.model_dump())

    return await get_test(test_model.id)  # NOTE: a bit dirty, but it works (prevents issue with ManyToManyField)
