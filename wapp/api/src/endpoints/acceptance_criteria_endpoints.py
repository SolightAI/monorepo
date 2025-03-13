from fastapi import APIRouter
from dto.schemas import AcceptanceCriteriaCreate as AcceptanceCriteriaCreateSchema, AcceptanceCriteria as AcceptanceCriteriaSchema, AcceptanceCriteriaUpdate as AcceptanceCriteriaUpdateSchema
from services.acceptance_criteria_services import get_acceptance_criteria, create_acceptance_criteria, get_all_acceptance_criteria, delete_acceptance_criteria, update_acceptance_criteria
from pydantic import UUID4
from typing import List


router = APIRouter(prefix="/acceptance-criteria", tags=["acceptance_criteria"])


@router.get("/")
async def get_all_acceptance_criteria_endpoint() -> List[AcceptanceCriteriaSchema]:
    return await get_all_acceptance_criteria()


@router.get("/{acceptance_criteria_id}")
async def get_acceptance_criteria_endpoint(acceptance_criteria_id: UUID4) -> AcceptanceCriteriaSchema:
    return await get_acceptance_criteria(acceptance_criteria_id)


@router.post("/")
async def create_acceptance_criteria_endpoint(acceptance_criteria: AcceptanceCriteriaCreateSchema) -> AcceptanceCriteriaSchema:
    return await create_acceptance_criteria(acceptance_criteria)


@router.delete("/{acceptance_criteria_id}")
async def delete_acceptance_criteria_endpoint(acceptance_criteria_id: UUID4) -> dict:
    """Delete an acceptance criteria and all its related tests, bugs, etc."""
    deleted = await delete_acceptance_criteria(acceptance_criteria_id)
    return {"success": deleted, "message": "Acceptance criteria and all related items deleted successfully"}


@router.put("/{acceptance_criteria_id}")
async def update_acceptance_criteria_endpoint(acceptance_criteria_id: UUID4, acceptance_criteria_update: AcceptanceCriteriaUpdateSchema) -> AcceptanceCriteriaSchema:
    """Update acceptance criteria with the provided data."""
    return await update_acceptance_criteria(acceptance_criteria_id, acceptance_criteria_update)
