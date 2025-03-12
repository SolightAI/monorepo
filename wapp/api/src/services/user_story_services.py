from fastapi import HTTPException
from dto.models import UserStory as UserStoryModel
from dto.schemas import UserStory as UserStorySchema, UserStoryCreate as UserStoryCreateSchema
from uuid import UUID


async def get_user_story(user_story_id: str) -> UserStorySchema:
    user_story = await UserStoryModel.get_or_none(id=user_story_id).prefetch_related("acceptance_criteria")

    if not user_story:
        raise HTTPException(status_code=404, detail="User story not found")

    return user_story


async def create_user_story(user_story: UserStoryCreateSchema) -> UserStorySchema:
    user_story_model = await UserStoryModel.create(**user_story.model_dump())

    return await get_user_story(user_story_model.id)  # NOTE: a bit dirty, but it works (prevents issue with ManyToManyField)


async def delete_user_story(user_story_id: str | UUID) -> bool:
    """
    Delete a user story and all its related acceptance criteria.
    
    Args:
        user_story_id: UUID of the user story to delete
        
    Returns:
        True if the user story was deleted, False otherwise
        
    Raises:
        HTTPException: If the user story was not found
    """
    user_story = await UserStoryModel.get_or_none(id=user_story_id).prefetch_related("acceptance_criteria")
    
    if not user_story:
        raise HTTPException(status_code=404, detail="User story not found")
    
    # Delete all acceptance criteria related to this user story
    from services.acceptance_criteria_services import delete_acceptance_criteria
    for acceptance_criteria in user_story.acceptance_criteria:
        await delete_acceptance_criteria(acceptance_criteria.id)
    
    # Delete the user story
    await user_story.delete()
    
    return True
