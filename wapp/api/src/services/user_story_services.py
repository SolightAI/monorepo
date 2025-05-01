import logging

from uuid import UUID
from pydantic import UUID4
from fastapi import HTTPException
from dto.models import UserStory as UserStoryModel
from dto.schemas import UserStory as UserStorySchema, UserStoryCreate as UserStoryCreateSchema, UserStoryUpdate as UserStoryUpdateSchema


logger = logging.getLogger(__name__)


async def get_user_story(user_story_id: str) -> UserStorySchema:
    user_story = await UserStoryModel.get_or_none(id=user_story_id)

    if not user_story:
        raise HTTPException(status_code=404, detail="User story not found")

    return user_story


async def create_user_story(user_story: UserStoryCreateSchema) -> UserStorySchema:
    user_story_model = await UserStoryModel.create(**user_story.model_dump())

    return await get_user_story(user_story_model.id)


async def delete_user_story(user_story_id: str | UUID) -> bool:
    """
    Delete a user story.

    Args:
        user_story_id: UUID of the user story to delete

    Returns:
        True if the user story was deleted, False otherwise

    Raises:
        HTTPException: If the user story was not found
    """
    user_story = await UserStoryModel.get_or_none(id=user_story_id)

    if not user_story:
        raise HTTPException(status_code=404, detail="User story not found")

    # Delete the user story
    await user_story.delete()

    return True


async def update_user_story(user_story_id: UUID4, user_story_update: UserStoryUpdateSchema) -> UserStoryModel:
    """
    Update a user story with the provided data.

    Args:
        user_story_id: UUID of the user story to update
        user_story_update: Data to update the user story with

    Returns:
        The updated user story

    Raises:
        HTTPException: If the user story was not found
    """
    user_story = await UserStoryModel.get_or_none(id=user_story_id)

    if not user_story:
        raise HTTPException(status_code=404, detail="User story not found")

    # Update only provided fields
    update_data = user_story_update.model_dump(exclude_unset=True, exclude_none=True)

    if update_data:
        for key, value in update_data.items():
            setattr(user_story, key, value)

        await user_story.save()

    return await get_user_story(user_story_id)  # Return the full user story with related entities
