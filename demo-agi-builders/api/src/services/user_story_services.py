from fastapi import HTTPException
from dto.models import UserStory as UserStoryModel
from dto.schemas import UserStory as UserStorySchema, UserStoryCreate as UserStoryCreateSchema


async def get_user_story(user_story_id: str) -> UserStorySchema:
    user_story = await UserStoryModel.get_or_none(id=user_story_id).prefetch_related("acceptance_criteria")

    if not user_story:
        raise HTTPException(status_code=404, detail="User story not found")

    return user_story


async def create_user_story(user_story: UserStoryCreateSchema) -> UserStorySchema:
    user_story_model = await UserStoryModel.create(**user_story.model_dump())

    return await get_user_story(user_story_model.id)  # NOTE: a bit dirty, but it works (prevents issue with ManyToManyField)
