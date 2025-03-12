from fastapi import HTTPException
from dto.models import Epic as EpicModel
from dto.schemas import EpicCreate as EpicCreateSchema
from pydantic import UUID4


async def get_epic(epic_id: UUID4) -> EpicModel:
    epic = await EpicModel.get_or_none(id=epic_id).prefetch_related("features")

    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found")

    return epic


async def create_epic(epic: EpicCreateSchema) -> EpicModel:
    epic_model = await EpicModel.create(**epic.model_dump())
    return await get_epic(epic_model.id)  # NOTE: a bit dirty, but it works (prevents issue with ManyToManyField)


async def delete_epic(epic_id: UUID4) -> bool:
    """
    Delete an epic and all its related features.

    Args:
        epic_id: UUID of the epic to delete

    Returns:
        True if the epic was deleted, False otherwise

    Raises:
        HTTPException: If the epic was not found
    """
    epic = await EpicModel.get_or_none(id=epic_id).prefetch_related("features")

    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found")

    # Delete all features related to this epic
    from services.feature_services import delete_feature
    for feature in epic.features:
        await delete_feature(feature.id)

    # Delete the epic
    await epic.delete()

    return True
