from fastapi import APIRouter, BackgroundTasks, Depends, Query
from typing import Dict, Any, Literal
from pydantic import UUID4

from services.generation_service import (
    trigger_full_generation,
    get_generation_status
)
from dependencies import get_current_user_dependency

# Centralize auth dependency at the router level
router = APIRouter(prefix="/generation", tags=["generation"], dependencies=[Depends(get_current_user_dependency)])


@router.post("/full")
async def generate_all_endpoint(
    scope: Literal["feature", "epic", "product"],
    id: UUID4,
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """
    Trigger full generation for a feature, epic, or product.

    This endpoint handles generating all content for:
    - A single feature: user stories, acceptance criteria, and tests
    - All features within an epic: full content for each feature
    - All features across all epics in a product

    Args:
        scope: The scope of generation ("feature", "epic", or "product")
        id: UUID of the entity to generate for
        background_tasks: FastAPI background tasks manager

    Returns:
        Dictionary with task ID for tracking the generation status
    """
    result = await trigger_full_generation(scope, id, background_tasks)
    return result


@router.get("/status/{task_id}")
async def get_generation_status_endpoint(
    task_id: str
) -> Dict[str, Any]:
    """
    Get the status of a generation task.

    Args:
        task_id: Task ID returned from the generation endpoint

    Returns:
        Dictionary with task status information
    """
    return await get_generation_status(task_id)
