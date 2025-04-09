from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks, Body
from dto.schemas import ProductCreate as ProductCreateSchema, Product as ProductSchema, ProductUpdate as ProductUpdateSchema
from services.product_services import get_product, create_product, get_products_list, delete_product, update_product
from services import organization_services
from pydantic import UUID4
from typing import List, Optional
from uuid import UUID
from dependencies import get_current_user_dependency
import requests
import asyncio
import os
from urllib.parse import urlparse
import logging
import uuid

router = APIRouter(prefix="/products", tags=["products"])


# Task manager base URL from environment variable or default to localhost
TASK_MANAGER_URL: str = os.getenv("TASK_MANAGER_URL")  # type: ignore


if not TASK_MANAGER_URL:
    raise ValueError("TASK_MANAGER_URL is not set")

# Configure the logger
logger = logging.getLogger(__name__)


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
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user_dependency)
) -> dict:
    """
    Create a new product.

    If organization_id is provided, the user must be a member of the organization
    with admin or owner role.
    
    This endpoint will also initiate a background task to validate the product URL 
    and find the login page.
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

    # Create the product
    created_product = await create_product(product)
    
    # Convert the Tortoise ORM model to a dictionary
    # Since model_dump() isn't available, use proper serialization method
    result_dict = dict(created_product)
    
    # Validate URL in background
    task_id = await trigger_url_validation(created_product.url, created_product.id)
    if task_id:
        # Add the task_id to the response
        result_dict["task_id"] = task_id
        logger.info(f"Added task_id {task_id} to product creation response for product {created_product.id}")
    else:
        logger.warning(f"No task_id received for URL validation of product {created_product.id}")
    
    return result_dict


@router.get("/url-validation-status/{task_id}")
async def get_url_validation_status(
    task_id: str,
) -> dict:
    """
    Check the status of a URL validation task.
    
    Returns the status and results from the task manager service.
    """
    try:
        loop = asyncio.get_event_loop()
        url = f"{TASK_MANAGER_URL}/validate-url/status/{task_id}"
        response = await loop.run_in_executor(None, lambda: requests.get(url))
        response.raise_for_status()
        return response.json()
    except requests.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Error checking URL validation status: {str(e)}")


async def trigger_url_validation(url: str, product_id: UUID) -> str:
    """
    Trigger the URL validation in the task manager service.
    
    Args:
        url: The URL to validate
        product_id: The ID of the product this URL belongs to
        
    Returns:
        The task ID from the task manager service
    """
    try:
        loop = asyncio.get_event_loop()
        url_endpoint = f"{TASK_MANAGER_URL}/validate-url/"
        response = await loop.run_in_executor(
            None, 
            lambda: requests.post(url_endpoint, json={"url": url})
        )
        response.raise_for_status()
        result = response.json()
        logger.info(f"URL validation started for product {product_id} with task ID: {result.get('task_id')}")
        return result.get("task_id")
    except requests.HTTPError as e:
        # Log the error
        logger.error(f"Error triggering URL validation for product {product_id}: {str(e)}")
        return None


@router.put("/{product_id}")
async def update_product_endpoint(
    product_id: UUID4,
    product_data: ProductUpdateSchema,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user_dependency)
) -> dict:
    """
    Update an existing product.

    The user must be a member of the organization that owns the product
    with admin or owner role.
    
    If the URL is updated, this will also trigger a new URL validation task.
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
    updated_product = await update_product(product_id, update_data)
    
    # Convert the Tortoise ORM model to a dictionary
    result_dict = dict(updated_product)
    
    # If URL was updated, trigger validation
    if "url" in update_data and update_data["url"] != product.url:
        task_id = await trigger_url_validation(updated_product.url, product_id)
        if not task_id:
            logger.warning(f"No task_id received for URL validation of updated product {product_id}")
        else:
            # Add the task_id to the response
            result_dict["task_id"] = task_id
            logger.info(f"Added task_id {task_id} to product update response for product {product_id}")

    return result_dict


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


@router.post("/validate-url/")
async def validate_url_endpoint(
    request: dict = Body(..., example={"url": "https://example.com"}),
    current_user=Depends(get_current_user_dependency)
) -> dict:
    """
    Directly validate a URL without creating a product.
    
    This endpoint triggers the task-manager's URL validation service
    and returns a task ID for tracking the validation process.
    """
    if not request.get("url"):
        raise HTTPException(status_code=400, detail="URL is required")
    
    url = request.get("url")
    
    # Generate a random UUID to associate with this validation request
    temp_id = uuid.uuid4()
    
    # Trigger validation in the task-manager
    task_id = await trigger_url_validation(url, temp_id)
    
    if not task_id:
        raise HTTPException(status_code=500, detail="Failed to start URL validation")
    
    return {"task_id": task_id}
