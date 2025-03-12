from fastapi import APIRouter
from dto.schemas import FeatureCreate as FeatureCreateSchema, Feature as FeatureSchema
from services.feature_services import get_feature, create_feature, delete_feature
from pydantic import UUID4


router = APIRouter(prefix="/features", tags=["features"])


@router.get("/{feature_id}")
async def get_feature_endpoint(feature_id: UUID4) -> FeatureSchema:
    return await get_feature(feature_id)


@router.post("/")
async def create_feature_endpoint(feature: FeatureCreateSchema) -> FeatureSchema:
    return await create_feature(feature)


@router.delete("/{feature_id}")
async def delete_feature_endpoint(feature_id: UUID4) -> dict:
    """Delete a feature and all its related user stories, acceptance criteria, etc."""
    deleted = await delete_feature(feature_id)
    return {"success": deleted, "message": "Feature and all related items deleted successfully"}

