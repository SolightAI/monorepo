import logging

from uuid import UUID
from pydantic import UUID4
from fastapi import HTTPException
from dto.models import Feature as FeatureModel, Epic as EpicModel
from dto.schemas import FeatureCreate as FeatureCreateSchema, FeatureUpdate as FeatureUpdateSchema
from services.user_story_services import create_user_story
from services.acceptance_criteria_services import create_acceptance_criteria
from dto.schemas import UserStoryCreate as UserStoryCreateSchema, AcceptanceCriteriaCreate as AcceptanceCriteriaCreateSchema


logger = logging.getLogger(__name__)


async def get_feature(feature_id: str | UUID) -> FeatureModel:
    feature = await FeatureModel.get_or_none(id=feature_id).prefetch_related("user_stories", "acceptance_criteria", "tests")

    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")

    return feature


async def create_feature(feature: FeatureCreateSchema) -> FeatureModel:
    # Check if the epic exists first
    epic = await EpicModel.get_or_none(id=feature.epic_id)
    if not epic:
        raise HTTPException(status_code=404, detail=f"Epic with ID {feature.epic_id} not found")

    feature_model = await FeatureModel.create(**feature.model_dump())

    # Add a default user story and acceptance criteria to the feature
    await create_user_story(UserStoryCreateSchema(feature_id=feature_model.id, name="Default User Story", description="This is a default user story for the feature"))
    await create_acceptance_criteria(AcceptanceCriteriaCreateSchema(feature_id=feature_model.id, name="Default Acceptance Criteria", description="This is a default acceptance criteria for the feature"))

    return await get_feature(feature_model.id)  # NOTE: a bit dirty, but it works (prevents issue with ManyToManyField)


async def delete_feature(feature_id: str | UUID) -> bool:
    """
    Delete a feature and all its related user stories, acceptance criteria, and tests.

    Args:
        feature_id: UUID of the feature to delete

    Returns:
        True if the feature was deleted, False otherwise

    Raises:
        HTTPException: If the feature was not found
    """
    feature = await FeatureModel.get_or_none(id=feature_id).prefetch_related("user_stories", "acceptance_criteria", "tests")

    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")

    # Delete all user stories related to this feature
    from services.user_story_services import delete_user_story
    for user_story in feature.user_stories:
        await delete_user_story(user_story.id)

    # Delete all acceptance criteria related to this feature
    from services.acceptance_criteria_services import delete_acceptance_criteria
    for acceptance_criteria in feature.acceptance_criteria:
        await delete_acceptance_criteria(acceptance_criteria.id)

    # Delete all tests related to this feature
    from services.test_services import delete_test
    for test in feature.tests:
        await delete_test(test.id)

    # Delete the feature
    await feature.delete()

    return True


async def update_feature(feature_id: UUID4, feature_update: FeatureUpdateSchema) -> FeatureModel:
    """
    Update a feature with the provided data.

    Args:
        feature_id: UUID of the feature to update
        feature_update: Data to update the feature with

    Returns:
        The updated feature

    Raises:
        HTTPException: If the feature was not found
    """
    feature = await FeatureModel.get_or_none(id=feature_id)

    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")

    # Update only provided fields
    update_data = feature_update.model_dump(exclude_unset=True, exclude_none=True)

    if update_data:
        for key, value in update_data.items():
            setattr(feature, key, value)

        await feature.save()

    return await get_feature(feature_id)  # Return the full feature with related entities
