from fastapi import APIRouter, Depends
from dto.schemas import EpicCreate as EpicCreateSchema, Epic as EpicSchema, EpicUpdate as EpicUpdateSchema
from services.epic_services import get_epic, create_epic, delete_epic, update_epic
from pydantic import UUID4
from dependencies import get_current_user

# Router-level auth dependency
router = APIRouter(
    prefix="/epics",
    tags=["epics"],
    dependencies=[Depends(get_current_user)]
)


@router.get("/{epic_id}")
async def get_epic_endpoint(epic_id: UUID4) -> EpicSchema:
    return await get_epic(epic_id)


@router.post("/")
async def create_epic_endpoint(epic: EpicCreateSchema) -> EpicSchema:
    return await create_epic(epic)


@router.delete("/{epic_id}")
async def delete_epic_endpoint(epic_id: UUID4) -> dict:
    """Delete an epic and all its related features, user stories, etc."""
    deleted = await delete_epic(epic_id)
    return {"success": deleted, "message": "Epic and all related items deleted successfully"}


@router.put("/{epic_id}")
async def update_epic_endpoint(epic_id: UUID4, epic_update: EpicUpdateSchema) -> EpicSchema:
    """Update an epic with the provided data."""
    return await update_epic(epic_id, epic_update)
