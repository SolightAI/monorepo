from fastapi import APIRouter, Depends, BackgroundTasks
from typing import Dict, Any
from dto.schemas import EpicCreate as EpicCreateSchema, Epic as EpicSchema, EpicUpdate as EpicUpdateSchema
from services.epic_services import (
    get_epic,
    create_epic,
    delete_epic,
    update_epic,
    generate_epics,
    get_epic_generation_status
)
from pydantic import UUID4
from dependencies import get_current_user_dependency


router = APIRouter(
    prefix="/epics",
    tags=["epics"],
    dependencies=[Depends(get_current_user_dependency)]
)


@router.get("/{epic_id}")
async def get_epic_endpoint(epic_id: UUID4) -> EpicSchema:
    return await get_epic(epic_id)


@router.post("/")
async def create_epic_endpoint(epic: EpicCreateSchema) -> EpicSchema:
    return await create_epic(epic)


@router.delete("/{epic_id}")
async def delete_epic_endpoint(epic_id: UUID4) -> dict:
    """Delete an epic and all its related features, user stories, etc."""
    deleted = await delete_epic(epic_id)
    return {"success": deleted, "message": "Epic and all related items deleted successfully"}


@router.put("/{epic_id}")
async def update_epic_endpoint(epic_id: UUID4, epic_update: EpicUpdateSchema) -> EpicSchema:
    """Update an epic with the provided data."""
    return await update_epic(epic_id, epic_update)


@router.post("/generate/{product_id}/")
async def generate_epics_endpoint(
    product_id: UUID4,
    background_tasks: BackgroundTasks
) -> Dict[str, str]:
    """
    Trigger epic generation for a product.

    Args:
        product_id: UUID of the product to generate epics for
        background_tasks: FastAPI background tasks manager

    Returns:
        Dictionary with task ID for tracking the generation status
    """
    task_id = await generate_epics(product_id, background_tasks)
    return {"task_id": task_id}


@router.get("/generate/status/{task_id}")
async def get_epic_generation_status_endpoint(
    task_id: str
) -> Dict[str, Any]:
    """
    Get the status of an epic generation task.

    Args:
        task_id: Task ID returned from the generation endpoint

    Returns:
        Dictionary with task status information
    """
    status = await get_epic_generation_status(task_id)
    return status
