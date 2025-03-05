from fastapi import HTTPException
from dto.models import Bug as BugModel
from dto.schemas import Bug as BugSchema, BugCreate as BugCreateSchema
from typing import List


async def get_bug(bug_id: str) -> BugSchema:
    bug = await BugModel.get_or_none(id=bug_id)

    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")

    return bug


async def get_all_bugs() -> List[BugSchema]:
    bugs = await BugModel.all().prefetch_related("test")
    return bugs


async def create_bug(bug: BugCreateSchema) -> BugSchema:
    bug_model = await BugModel.create(**bug.model_dump())

    return await get_bug(bug_model.id)  # NOTE: a bit dirty, but it works (prevents issue with ManyToManyField)
