from fastapi import HTTPException
from dto.models import AcceptanceCriteria as AcceptanceCriteriaModel
from dto.schemas import AcceptanceCriteria as AcceptanceCriteriaSchema, AcceptanceCriteriaCreate as AcceptanceCriteriaCreateSchema, AcceptanceCriteriaUpdate as AcceptanceCriteriaUpdateSchema
from uuid import UUID
from pydantic import UUID4


async def get_all_acceptance_criteria() -> list[AcceptanceCriteriaSchema]:
    return await AcceptanceCriteriaModel.all().prefetch_related("tests")


async def get_acceptance_criteria(acceptance_criteria_id: str) -> AcceptanceCriteriaSchema:
    acceptance_criteria = await AcceptanceCriteriaModel.get_or_none(id=acceptance_criteria_id).prefetch_related("tests")

    if not acceptance_criteria:
        raise HTTPException(status_code=404, detail="Acceptance criteria not found")

    return acceptance_criteria


async def get_acceptance_criteria_by_feature(feature_id: UUID) -> list[AcceptanceCriteriaSchema]:
    """
    Get all acceptance criteria for a feature.
    
    Args:
        feature_id: UUID of the feature
    
    Returns:
        List of acceptance criteria for the feature
    """
    return await AcceptanceCriteriaModel.filter(feature_id=feature_id).prefetch_related("tests")


async def create_acceptance_criteria(acceptance_criteria: AcceptanceCriteriaCreateSchema) -> AcceptanceCriteriaSchema:
    acceptance_criteria_model = await AcceptanceCriteriaModel.create(**acceptance_criteria.model_dump())

    return await get_acceptance_criteria(acceptance_criteria_model.id)  # NOTE: a bit dirty, but it works (prevents issue with ManyToManyField)


async def delete_acceptance_criteria(acceptance_criteria_id: str | UUID) -> bool:
    """
    Delete an acceptance criteria and all its related tests.

    Args:
        acceptance_criteria_id: UUID of the acceptance criteria to delete

    Returns:
        True if the acceptance criteria was deleted, False otherwise

    Raises:
        HTTPException: If the acceptance criteria was not found
    """
    acceptance_criteria = await AcceptanceCriteriaModel.get_or_none(id=acceptance_criteria_id).prefetch_related("tests")

    if not acceptance_criteria:
        raise HTTPException(status_code=404, detail="Acceptance criteria not found")

    # Delete all tests related to this acceptance criteria
    from services.test_services import delete_test
    for test in acceptance_criteria.tests:
        await delete_test(test.id)

    # Delete the acceptance criteria
    await acceptance_criteria.delete()

    return True


async def update_acceptance_criteria(acceptance_criteria_id: UUID4, acceptance_criteria_update: AcceptanceCriteriaUpdateSchema) -> AcceptanceCriteriaModel:
    """
    Update acceptance criteria with the provided data.

    Args:
        acceptance_criteria_id: UUID of the acceptance criteria to update
        acceptance_criteria_update: Data to update the acceptance criteria with

    Returns:
        The updated acceptance criteria

    Raises:
        HTTPException: If the acceptance criteria was not found
    """
    acceptance_criteria = await AcceptanceCriteriaModel.get_or_none(id=acceptance_criteria_id)

    if not acceptance_criteria:
        raise HTTPException(status_code=404, detail="Acceptance criteria not found")

    # Update only provided fields
    update_data = acceptance_criteria_update.model_dump(exclude_unset=True, exclude_none=True)

    if update_data:
        for key, value in update_data.items():
            setattr(acceptance_criteria, key, value)

        await acceptance_criteria.save()

    return await get_acceptance_criteria(acceptance_criteria_id)  # Return the full acceptance criteria with related entities
