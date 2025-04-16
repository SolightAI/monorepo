from fastapi import APIRouter, Depends, BackgroundTasks
from typing import Dict, Any
from dto.schemas import FeatureCreate as FeatureCreateSchema, Feature as FeatureSchema, FeatureUpdate as FeatureUpdateSchema
from services.feature_services import (
    get_feature,
    create_feature,
    delete_feature,
    update_feature,
    generate_features,
    get_feature_generation_status
)
from pydantic import UUID4
from dependencies import get_current_user_dependency


router = APIRouter(
    prefix="/features",
    tags=["features"],
    dependencies=[Depends(get_current_user_dependency)]
)


@router.get("/{feature_id}")
async def get_feature_endpoint(feature_id: UUID4) -> FeatureSchema:
    return await get_feature(feature_id)


@router.post("/")
async def create_feature_endpoint(feature: FeatureCreateSchema) -> FeatureSchema:
    return await create_feature(feature)


@router.delete("/{feature_id}")
async def delete_feature_endpoint(feature_id: UUID4) -> dict:
    """Delete a feature and all its related user stories, acceptance criteria, etc."""
    deleted = await delete_feature(feature_id)
    return {"success": deleted, "message": "Feature and all related items deleted successfully"}


@router.put("/{feature_id}")
async def update_feature_endpoint(feature_id: UUID4, feature_update: FeatureUpdateSchema) -> FeatureSchema:
    """Update a feature with the provided data."""
    return await update_feature(feature_id, feature_update)


@router.post("/generate/{epic_id}")
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


@router.get("/generate/status/{task_id}")
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
