from fastapi import APIRouter, BackgroundTasks, Depends
from typing import Dict, Any
from pydantic import UUID4

from services.feature_generation_service import (
    generate_features,
    get_feature_generation_status
)
from services.auth_services import get_current_user

# Moved authentication to router level
router = APIRouter(
    prefix="/feature-generation",
    tags=["feature_generation"],
    dependencies=[Depends(get_current_user)]
)


@router.post("/{epic_id}")
async def generate_features_endpoint(
    epic_id: UUID4,
    background_tasks: BackgroundTasks
) -> Dict[str, str]:
    """
    Trigger feature generation for an epic.

    Args:
        epic_id: UUID of the epic to generate features for
        background_tasks: FastAPI background tasks manager

    Returns:
        Dictionary with task ID for tracking the generation status
    """
    task_id = await generate_features(epic_id, background_tasks)
    return {"task_id": task_id}


@router.get("/status/{task_id}")
async def get_feature_generation_status_endpoint(
    task_id: str
) -> Dict[str, Any]:
    """
    Get the status of a feature generation task.

    Args:
        task_id: Task ID returned from the generation endpoint

    Returns:
        Dictionary with task status information
    """
    status = await get_feature_generation_status(task_id)
    return status
