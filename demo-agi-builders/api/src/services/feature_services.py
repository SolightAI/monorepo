from fastapi import HTTPException
from dto.models import Feature as FeatureModel
from dto.schemas import FeatureCreate as FeatureCreateSchema


async def get_feature(feature_id: str) -> FeatureModel:
    feature = await FeatureModel.get_or_none(id=feature_id).prefetch_related("user_stories")

    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")

    return feature


async def create_feature(feature: FeatureCreateSchema) -> FeatureModel:
    feature_model = await FeatureModel.create(**feature.model_dump())

    return await get_feature(feature_model.id)  # NOTE: a bit dirty, but it works (prevents issue with ManyToManyField)
