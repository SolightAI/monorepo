from fastapi import APIRouter, BackgroundTasks,HTTPException,Depends
from typing import Dict, Any
from pydantic import UUID4

from services.acceptance_criteria_generation_service import (
    generate_acceptance_criteria,
    get_acceptance_criteria_generation_status
)
from services.auth_services import get_current_user

#  Centralize auth dependency here
router = APIRouter(prefix="/acceptance-criteria-generation",tags=["acceptance_criteria_generation"],dependencies=[Depends(get_current_user)])

@router.post("/{feature_id}")
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


@router.get("/status/{task_id}")
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
