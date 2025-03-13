from fastapi import APIRouter
from dto.schemas import UserStoryCreate as UserStoryCreateSchema, UserStory as UserStorySchema, UserStoryUpdate as UserStoryUpdateSchema
from services.user_story_services import get_user_story, create_user_story, delete_user_story, update_user_story
from pydantic import UUID4


router = APIRouter(prefix="/user-stories", tags=["user_stories"])


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
async def update_user_story_endpoint(user_story_id: UUID4, user_story_update: UserStoryUpdateSchema) -> UserStorySchema:
    """Update a user story with the provided data."""
    return await update_user_story(user_story_id, user_story_update)
