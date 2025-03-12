from fastapi import APIRouter, HTTPException
from dto.schemas import ProductCreate as ProductCreateSchema, Product as ProductSchema
from services.product_services import get_product, create_product, get_product_by_url_path, get_products_list, delete_product
from pydantic import UUID4
from typing import List, Optional


router = APIRouter(prefix="/products", tags=["products"])


@router.get("/")
async def get_all_products_endpoint() -> List[ProductSchema]:
    """Get all products"""
    return await get_products_list()


@router.get("/by-path/{url_path}")
async def get_product_by_path_endpoint(url_path: str) -> Optional[ProductSchema]:
    """
    Get a product by matching the URL path with the product URL.
    If no product is found, returns null.
    """
    product = await get_product_by_url_path(url_path)
    return product


@router.get("/{product_id}")
async def get_product_endpoint(product_id: UUID4) -> ProductSchema:
    return await get_product(product_id)


@router.post("/")
async def create_product_endpoint(product: ProductCreateSchema) -> ProductSchema:
    return await create_product(product)


@router.delete("/{product_id}")
async def delete_product_endpoint(product_id: UUID4) -> dict:
    """Delete a product and all its related epics, features, user stories, etc."""
    deleted = await delete_product(product_id)
    return {"success": deleted, "message": "Product and all related items deleted successfully"}
