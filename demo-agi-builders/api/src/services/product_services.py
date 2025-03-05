from fastapi import HTTPException
from dto.schemas import ProductCreate as ProductCreateSchema
from dto.models import Product as ProductModel
from pydantic import UUID4


async def get_product(product_id: UUID4) -> ProductModel:

    product = await ProductModel.get_or_none(id=product_id).prefetch_related("epics")

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return product


async def create_product(product: ProductCreateSchema) -> ProductModel:
    product_model = await ProductModel.create(**product.model_dump())

    return await get_product(product_model.id)  # NOTE: a bit dirty, but it works (prevents issue with ManyToManyField)
