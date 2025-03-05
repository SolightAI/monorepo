from fastapi import APIRouter
from dto.schemas import ProductCreate as ProductCreateSchema, Product as ProductSchema
from services.product_services import get_product, create_product
from pydantic import UUID4


router = APIRouter(prefix="/products", tags=["products"])


@router.get("/{product_id}")
async def get_product_endpoint(product_id: UUID4) -> ProductSchema:
    return await get_product(product_id)


@router.post("/")
async def create_product_endpoint(product: ProductCreateSchema) -> ProductSchema:
    return await create_product(product)
