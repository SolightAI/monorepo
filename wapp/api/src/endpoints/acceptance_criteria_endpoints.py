from fastapi import APIRouter, Depends, BackgroundTasks
from dto.schemas import AcceptanceCriteriaCreate as AcceptanceCriteriaCreateSchema, AcceptanceCriteria as AcceptanceCriteriaSchema, AcceptanceCriteriaUpdate as AcceptanceCriteriaUpdateSchema
from services.acceptance_criteria_services import (
    get_acceptance_criteria,
    create_acceptance_criteria,
    get_all_acceptance_criteria,
    delete_acceptance_criteria,
    update_acceptance_criteria,
    get_acceptance_criteria_by_feature,
    generate_acceptance_criteria,
    get_acceptance_criteria_generation_status
)
from pydantic import UUID4
from typing import List, Dict, Any
from dependencies import get_current_user_dependency


router = APIRouter(prefix="/acceptance-criteria", tags=["acceptance_criteria"], dependencies=[Depends(get_current_user_dependency)])


@router.get("/")
async def get_all_acceptance_criteria_endpoint() -> List[AcceptanceCriteriaSchema]:
    return await get_all_acceptance_criteria()


@router.get("/{acceptance_criteria_id}")
async def get_acceptance_criteria_endpoint(acceptance_criteria_id: UUID4) -> AcceptanceCriteriaSchema:
    return await get_acceptance_criteria(acceptance_criteria_id)


@router.get("/by-feature/{feature_id}")
async def get_acceptance_criteria_by_feature_endpoint(feature_id: UUID4) -> List[AcceptanceCriteriaSchema]:
    """Get all acceptance criteria for a feature."""
    return await get_acceptance_criteria_by_feature(feature_id)


@router.post("/")
async def create_acceptance_criteria_endpoint(acceptance_criteria: AcceptanceCriteriaCreateSchema) -> AcceptanceCriteriaSchema:
    return await create_acceptance_criteria(acceptance_criteria)


@router.delete("/{acceptance_criteria_id}")
async def delete_acceptance_criteria_endpoint(acceptance_criteria_id: UUID4) -> dict:
    """Delete an acceptance criteria."""
    deleted = await delete_acceptance_criteria(acceptance_criteria_id)
    return {"success": deleted, "message": "Acceptance criteria deleted successfully"}


@router.put("/{acceptance_criteria_id}")
async def update_acceptance_criteria_endpoint(acceptance_criteria_id: UUID4, acceptance_criteria_update: AcceptanceCriteriaUpdateSchema) -> AcceptanceCriteriaSchema:
    """Update acceptance criteria with the provided data."""
    return await update_acceptance_criteria(acceptance_criteria_id, acceptance_criteria_update)


@router.post("/generate/{feature_id}")
async def generate_acceptance_criteria_endpoint(
    feature_id: UUID4,
    background_tasks: BackgroundTasks
) -> Dict[str, str]:
    """
    Trigger acceptance criteria generation for a feature.

    Args:
        feature_id: UUID of the feature to generate acceptance criteria for
        background_tasks: FastAPI background tasks manager

    Returns:
        Dictionary with task ID for tracking the generation status
    """
    task_id = await generate_acceptance_criteria(feature_id, background_tasks)
    return {"task_id": task_id}


@router.get("/generate/status/{task_id}")
async def get_acceptance_criteria_generation_status_endpoint(
    task_id: str
) -> Dict[str, Any]:
    """
    Get the status of an acceptance criteria generation task.

    Args:
        task_id: Task ID returned from the generation endpoint

    Returns:
        Dictionary with task status information
    """
    status = await get_acceptance_criteria_generation_status(task_id)
    return status
