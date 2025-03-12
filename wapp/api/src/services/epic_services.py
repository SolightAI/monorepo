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
