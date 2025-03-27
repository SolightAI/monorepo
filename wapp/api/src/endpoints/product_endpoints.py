from fastapi import APIRouter, HTTPException, Depends, Query
from dto.schemas import ProductCreate as ProductCreateSchema, Product as ProductSchema, ProductUpdate as ProductUpdateSchema
from services.product_services import get_product, create_product, get_products_list, delete_product, update_product
from services import organization_services
from pydantic import UUID4
from typing import List, Optional
from uuid import UUID
from dependencies import get_current_user_dependency


router = APIRouter(prefix="/products", tags=["products"])


@router.get("/")
async def get_all_products_endpoint(
    organization_id: UUID = Query(..., description="Organization ID to filter products by"),
    current_user=Depends(get_current_user_dependency)
) -> List[ProductSchema]:
    """
    Get all products for a specific organization.
    The user must be a member of the organization to access its products.
    """
    # Check if user is a member of the organization
    member = await organization_services.get_organization_member(
        organization_id, current_user.id
    )
    if not member:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to access products in this organization"
        )

    return await get_products_list(organization_id)


@router.get("/{product_id}")
async def get_product_endpoint(
    product_id: UUID4,
    organization_id: UUID = Query(..., description="Organization ID the product belongs to"),
    current_user=Depends(get_current_user_dependency)
) -> ProductSchema:
    """
    Get a product by ID.
    The user must be a member of the organization that owns the product.
    """
    # Check if user is a member of the organization
    member = await organization_services.get_organization_member(
        organization_id, current_user.id
    )
    if not member:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to access this product"
        )

    return await get_product(product_id)


@router.post("/")
async def create_product_endpoint(
    product: ProductCreateSchema,
    current_user=Depends(get_current_user_dependency)
) -> ProductSchema:
    """
    Create a new product.

    If organization_id is provided, the user must be a member of the organization
    with admin or owner role.
    """
    if product.organization_id:
        # Check if user is a member of the organization with appropriate permissions
        member = await organization_services.get_organization_member(
            product.organization_id, current_user.id
        )
        if not member or member.role not in ["owner", "admin"]:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to create products in this organization"
            )

    return await create_product(product)


@router.put("/{product_id}")
async def update_product_endpoint(
    product_id: UUID4,
    product_data: ProductUpdateSchema,
    current_user=Depends(get_current_user_dependency)
) -> ProductSchema:
    """
    Update an existing product.

    The user must be a member of the organization that owns the product
    with admin or owner role.
    """
    # First get the product to check its organization
    product = await get_product(product_id)

    # If the product belongs to an organization, check if the user has permission
    if product.organization_id:
        member = await organization_services.get_organization_member(
            product.organization_id, current_user.id
        )
        if not member or member.role not in ["owner", "admin"]:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to update this product"
            )

    # Only include non-None values in the update
    update_data = product_data.model_dump(exclude_unset=True, exclude_none=True)

    # Update the product
    return await update_product(product_id, update_data)


@router.delete("/{product_id}")
async def delete_product_endpoint(
    product_id: UUID4,
    current_user=Depends(get_current_user_dependency)
) -> dict:
    """
    Delete a product and all its related epics, features, user stories, etc.

    The user must be a member of the organization that owns the product
    with admin or owner role.
    """
    # First get the product to check its organization
    product = await get_product(product_id)

    # If the product belongs to an organization, check if the user has permission
    if product.organization_id:
        member = await organization_services.get_organization_member(
            product.organization_id, current_user.id
        )
        if not member or member.role not in ["owner", "admin"]:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to delete this product"
            )

    deleted = await delete_product(product_id)
    return {"success": deleted, "message": "Product and all related items deleted successfully"}
