from fastapi import APIRouter, BackgroundTasks, Depends
from typing import Dict, Any
from pydantic import UUID4

from services.epic_generation_service import (
    generate_epics,
    get_epic_generation_status
)
from services.auth_services import get_current_user

router = APIRouter(prefix="/epic-generation", tags=["epic_generation"])


@router.post("/{product_id}")
async def generate_epics_endpoint(
    product_id: UUID4,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user)
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


@router.get("/status/{task_id}")
async def get_epic_generation_status_endpoint(
    task_id: str,
    current_user=Depends(get_current_user)
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
