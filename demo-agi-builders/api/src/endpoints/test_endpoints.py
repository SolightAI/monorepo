from fastapi import APIRouter
from dto.schemas import TestCreate as TestCreateSchema, Test as TestSchema
from services.test_services import get_test, create_test, get_all_tests
from pydantic import UUID4
from typing import List


router = APIRouter(prefix="/tests", tags=["tests"])


@router.get("/")
async def get_all_tests_endpoint() -> List[TestSchema]:
    return await get_all_tests()


@router.get("/{test_id}")
async def get_test_endpoint(test_id: UUID4) -> TestSchema:
    return await get_test(test_id)


@router.post("/")
async def create_test_endpoint(test: TestCreateSchema) -> TestSchema:
    return await create_test(test)
