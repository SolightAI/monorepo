from fastapi import APIRouter, BackgroundTasks, Depends
from dto.schemas import UserStoryCreate as UserStoryCreateSchema, UserStory as UserStorySchema, UserStoryUpdate as UserStoryUpdateSchema
from services.user_story_services import (
    get_user_story,
    create_user_story,
    delete_user_story,
    update_user_story,
    generate_user_stories,
    get_user_stories_generation_status
)
from pydantic import UUID4
from typing import Dict, Any
from dependencies import get_current_user_dependency

# Apply auth dependency once here
router = APIRouter(prefix="/user-stories", tags=["user_stories"], dependencies=[Depends(get_current_user_dependency)])


@router.get("/{user_story_id}")
async def get_user_story_endpoint(user_story_id: UUID4) -> UserStorySchema:
    return await get_user_story(user_story_id)


@router.post("/")
async def create_user_story_endpoint(user_story: UserStoryCreateSchema) -> UserStorySchema:
    return await create_user_story(user_story)


@router.delete("/{user_story_id}")
async def delete_user_story_endpoint(user_story_id: UUID4) -> dict:
    """Delete a user story and all its related acceptance criteria, tests, etc."""
    deleted = await delete_user_story(user_story_id)
    return {"success": deleted, "message": "User story and all related items deleted successfully"}


@router.put("/{user_story_id}")
async def update_user_story_endpoint(
    user_story_id: UUID4,
    user_story_update: UserStoryUpdateSchema
) -> UserStorySchema:
    """Update a user story with the provided data."""
    return await update_user_story(user_story_id, user_story_update)


@router.post("/generate")
async def generate_user_stories_endpoint(
    feature_id: UUID4,
    background_tasks: BackgroundTasks
) -> Dict[str, str]:
    """
    Generate user stories for a feature using AI.

    Args:
        feature_id: UUID of the feature to generate user stories for
        background_tasks: FastAPI BackgroundTasks object

    Returns:
        Dictionary with task_id for tracking the generation process
    """
    task_id = await generate_user_stories(feature_id, background_tasks)
    return {"task_id": task_id}


@router.get("/generate/status/{task_id}")
async def get_user_stories_generation_status_endpoint(task_id: str) -> Dict[str, Any]:
    """
    Get the status of a user stories generation task.

    Args:
        task_id: Task ID to check

    Returns:
        Dictionary with task status information
    """
    return await get_user_stories_generation_status(task_id)
