from fastapi import APIRouter
from dto.schemas import BugCreate as BugCreateSchema, Bug as BugSchema
from services.bug_services import get_bug, create_bug, get_all_bugs
from pydantic import UUID4
from typing import List


router = APIRouter(prefix="/bugs", tags=["bugs"])


@router.get("/")
async def get_all_bugs_endpoint() -> List[BugSchema]:
    return await get_all_bugs()


@router.get("/{bug_id}")
async def get_bug_endpoint(bug_id: UUID4) -> BugSchema:
    return await get_bug(bug_id)


@router.post("/")
async def create_bug_endpoint(bug: BugCreateSchema) -> BugSchema:
    return await create_bug(bug)
