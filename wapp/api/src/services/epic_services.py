import logging

from fastapi import HTTPException
from dto.models import Epic as EpicModel, Product as ProductModel
from dto.schemas import EpicCreate as EpicCreateSchema, EpicUpdate as EpicUpdateSchema
from pydantic import UUID4


logger = logging.getLogger(__name__)


async def get_epic(epic_id: UUID4) -> EpicModel:
    epic = await EpicModel.get_or_none(id=epic_id).prefetch_related("features")

    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found")

    return epic


async def create_epic(epic: EpicCreateSchema) -> EpicModel:
    # Check if the product exists first
    product = await ProductModel.get_or_none(id=epic.product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product with ID {epic.product_id} not found")

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


async def update_epic(epic_id: UUID4, epic_update: EpicUpdateSchema) -> EpicModel:
    """
    Update an epic with the provided data.

    Args:
        epic_id: UUID of the epic to update
        epic_update: Data to update the epic with

    Returns:
        The updated epic

    Raises:
        HTTPException: If the epic was not found
    """
    epic = await EpicModel.get_or_none(id=epic_id)

    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found")

    # Update only provided fields
    update_data = epic_update.model_dump(exclude_unset=True, exclude_none=True)

    if update_data:
        for key, value in update_data.items():
            setattr(epic, key, value)

        await epic.save()

    return await get_epic(epic_id)  # Return the full epic with related entities
