from fastapi import APIRouter
from dto.schemas import AcceptanceCriteriaCreate as AcceptanceCriteriaCreateSchema, AcceptanceCriteria as AcceptanceCriteriaSchema
from services.acceptance_criteria_services import get_acceptance_criteria, create_acceptance_criteria, get_all_acceptance_criteria
from pydantic import UUID4
from typing import List


router = APIRouter(prefix="/acceptance_criteria", tags=["acceptance_criteria"])


@router.get("/")
async def get_all_acceptance_criteria_endpoint() -> List[AcceptanceCriteriaSchema]:
    return await get_all_acceptance_criteria()


@router.get("/{acceptance_criteria_id}")
async def get_acceptance_criteria_endpoint(acceptance_criteria_id: UUID4) -> AcceptanceCriteriaSchema:
    return await get_acceptance_criteria(acceptance_criteria_id)


@router.post("/")
async def create_acceptance_criteria_endpoint(acceptance_criteria: AcceptanceCriteriaCreateSchema) -> AcceptanceCriteriaSchema:
    return await create_acceptance_criteria(acceptance_criteria)
