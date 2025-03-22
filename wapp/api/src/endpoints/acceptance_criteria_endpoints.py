from fastapi import APIRouter, Depends
from dto.schemas import AcceptanceCriteriaCreate as AcceptanceCriteriaCreateSchema, AcceptanceCriteria as AcceptanceCriteriaSchema, AcceptanceCriteriaUpdate as AcceptanceCriteriaUpdateSchema
from services.acceptance_criteria_services import get_acceptance_criteria, create_acceptance_criteria, get_all_acceptance_criteria, delete_acceptance_criteria, update_acceptance_criteria, get_acceptance_criteria_by_feature
from pydantic import UUID4
from typing import List
from dependencies import get_current_user


router = APIRouter(prefix="/acceptance-criteria", tags=["acceptance_criteria"])


@router.get("/")
async def get_all_acceptance_criteria_endpoint(current_user=Depends(get_current_user)) -> List[AcceptanceCriteriaSchema]:
    return await get_all_acceptance_criteria()


@router.get("/{acceptance_criteria_id}")
async def get_acceptance_criteria_endpoint(acceptance_criteria_id: UUID4, current_user=Depends(get_current_user)) -> AcceptanceCriteriaSchema:
    return await get_acceptance_criteria(acceptance_criteria_id)


@router.get("/by-feature/{feature_id}")
async def get_acceptance_criteria_by_feature_endpoint(feature_id: UUID4, current_user=Depends(get_current_user)) -> List[AcceptanceCriteriaSchema]:
    """Get all acceptance criteria for a feature."""
    return await get_acceptance_criteria_by_feature(feature_id)


@router.post("/")
async def create_acceptance_criteria_endpoint(acceptance_criteria: AcceptanceCriteriaCreateSchema, current_user=Depends(get_current_user)) -> AcceptanceCriteriaSchema:
    return await create_acceptance_criteria(acceptance_criteria)


@router.delete("/{acceptance_criteria_id}")
async def delete_acceptance_criteria_endpoint(acceptance_criteria_id: UUID4, current_user=Depends(get_current_user)) -> dict:
    """Delete an acceptance criteria and all its related tests, bugs, etc."""
    deleted = await delete_acceptance_criteria(acceptance_criteria_id)
    return {"success": deleted, "message": "Acceptance criteria and all related items deleted successfully"}


@router.put("/{acceptance_criteria_id}")
async def update_acceptance_criteria_endpoint(acceptance_criteria_id: UUID4, acceptance_criteria_update: AcceptanceCriteriaUpdateSchema, current_user=Depends(get_current_user)) -> AcceptanceCriteriaSchema:
    """Update acceptance criteria with the provided data."""
    return await update_acceptance_criteria(acceptance_criteria_id, acceptance_criteria_update)
