from fastapi import APIRouter, HTTPException, Depends, Query
from dto.schemas import ProductCreate as ProductCreateSchema, Product as ProductSchema, ProductUpdate as ProductUpdateSchema
from services.product_services import get_product, create_product, get_product_by_url_path, get_products_list, delete_product, update_product
from services import organization_services
from pydantic import UUID4
from typing import List, Optional
from uuid import UUID
from dependencies import get_current_user


router = APIRouter(prefix="/products", tags=["products"])


@router.get("/")
async def get_all_products_endpoint(
    organization_id: Optional[UUID] = Query(None, description="Filter products by organization ID"),
    current_user=Depends(get_current_user)
) -> List[ProductSchema]:
    """
    Get all products, optionally filtered by organization.

    If organization_id is provided, only products belonging to that organization will be returned.
    The user must be a member of the organization to access its products.
    """
    if organization_id:
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


@router.get("/by-path/{url_path}")
async def get_product_by_path_endpoint(
    url_path: str,
    organization_id: Optional[UUID] = Query(None, description="Filter by organization ID"),
    current_user=Depends(get_current_user)
) -> Optional[ProductSchema]:
    """
    Get a product by matching the URL path with the product URL.
    If no product is found, returns null.

    If organization_id is provided, only products belonging to that organization will be considered.
    The user must be a member of the organization to access its products.
    """
    if organization_id:
        # Check if user is a member of the organization
        member = await organization_services.get_organization_member(
            organization_id, current_user.id
        )
        if not member:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to access products in this organization"
            )

    product = await get_product_by_url_path(url_path, organization_id)
    return product


@router.get("/{product_id}")
async def get_product_endpoint(
    product_id: UUID4,
    current_user=Depends(get_current_user)
) -> ProductSchema:
    """
    Get a product by ID.

    The user must be a member of the organization that owns the product.
    """
    # First get the product to check its organization
    product = await get_product(product_id)

    # If the product belongs to an organization, check if the user is a member
    if product.organization_id:
        member = await organization_services.get_organization_member(
            product.organization_id, current_user.id
        )
        if not member:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to access this product"
            )

    return product


@router.post("/")
async def create_product_endpoint(
    product: ProductCreateSchema,
    current_user=Depends(get_current_user)
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
    current_user=Depends(get_current_user)
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
    current_user=Depends(get_current_user)
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
