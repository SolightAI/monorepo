from fastapi import HTTPException
from dto.models import AcceptanceCriteria as AcceptanceCriteriaModel
from dto.schemas import AcceptanceCriteria as AcceptanceCriteriaSchema, AcceptanceCriteriaCreate as AcceptanceCriteriaCreateSchema


async def get_all_acceptance_criteria() -> list[AcceptanceCriteriaSchema]:
    return await AcceptanceCriteriaModel.all().prefetch_related("tests")


async def get_acceptance_criteria(acceptance_criteria_id: str) -> AcceptanceCriteriaSchema:
    acceptance_criteria = await AcceptanceCriteriaModel.get_or_none(id=acceptance_criteria_id).prefetch_related("tests")

    if not acceptance_criteria:
        raise HTTPException(status_code=404, detail="Acceptance criteria not found")

    return acceptance_criteria


async def create_acceptance_criteria(acceptance_criteria: AcceptanceCriteriaCreateSchema) -> AcceptanceCriteriaSchema:
    acceptance_criteria_model = await AcceptanceCriteriaModel.create(**acceptance_criteria.model_dump())

    return await get_acceptance_criteria(acceptance_criteria_model.id)  # NOTE: a bit dirty, but it works (prevents issue with ManyToManyField)
