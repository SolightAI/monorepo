from fastapi import APIRouter
from dto.schemas import EpicCreate as EpicCreateSchema, Epic as EpicSchema
from services.epic_services import get_epic, create_epic
from pydantic import UUID4


router = APIRouter(prefix="/epics", tags=["epics"])


@router.get("/{epic_id}")
async def get_epic_endpoint(epic_id: UUID4) -> EpicSchema:
    return await get_epic(epic_id)


@router.post("/")
async def create_epic_endpoint(epic: EpicCreateSchema) -> EpicSchema:
    return await create_epic(epic)

