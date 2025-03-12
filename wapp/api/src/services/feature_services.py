from fastapi import HTTPException
from dto.models import Feature as FeatureModel
from dto.schemas import FeatureCreate as FeatureCreateSchema
from uuid import UUID


async def get_feature(feature_id: str | UUID) -> FeatureModel:
    feature = await FeatureModel.get_or_none(id=feature_id).prefetch_related("user_stories")

    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")

    return feature


async def create_feature(feature: FeatureCreateSchema) -> FeatureModel:
    feature_model = await FeatureModel.create(**feature.model_dump())

    return await get_feature(feature_model.id)  # NOTE: a bit dirty, but it works (prevents issue with ManyToManyField)


async def delete_feature(feature_id: str | UUID) -> bool:
    """
    Delete a feature and all its related user stories.

    Args:
        feature_id: UUID of the feature to delete

    Returns:
        True if the feature was deleted, False otherwise

    Raises:
        HTTPException: If the feature was not found
    """
    feature = await FeatureModel.get_or_none(id=feature_id).prefetch_related("user_stories")

    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")

    # Delete all user stories related to this feature
    from services.user_story_services import delete_user_story
    for user_story in feature.user_stories:
        await delete_user_story(user_story.id)

    # Delete the feature
    await feature.delete()

    return True
