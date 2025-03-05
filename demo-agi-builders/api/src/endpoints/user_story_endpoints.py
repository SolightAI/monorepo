from fastapi import APIRouter
from dto.schemas import UserStoryCreate as UserStoryCreateSchema, UserStory as UserStorySchema
from services.user_story_services import get_user_story, create_user_story
from pydantic import UUID4


router = APIRouter(prefix="/user_stories", tags=["user_stories"])


@router.get("/{user_story_id}")
async def get_user_story_endpoint(user_story_id: UUID4) -> UserStorySchema:
    return await get_user_story(user_story_id)


@router.post("/")
async def create_user_story_endpoint(user_story: UserStoryCreateSchema) -> UserStorySchema:
    return await create_user_story(user_story)

