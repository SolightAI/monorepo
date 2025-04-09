from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks, Body
from dto.schemas import ProductCreate as ProductCreateSchema, Product as ProductSchema, ProductUpdate as ProductUpdateSchema
from services.product_services import get_product, create_product, get_products_list, delete_product, update_product
from services import organization_services
from pydantic import UUID4
from typing import List, Optional
from uuid import UUID
from dependencies import get_current_user_dependency
import requests
import os
from urllib.parse import urlparse
import logging
import uuid
import asyncio

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
    task_id = await trigger_url_validation(created_product.url, created_product.id, background_tasks)
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
        # Use asyncio.to_thread to run synchronous request in a separate thread
        response = await asyncio.to_thread(
            requests.get,
            f"{TASK_MANAGER_URL}/validate-url/status/{task_id}"
        )
        response.raise_for_status()
        return response.json()
    except requests.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Error checking URL validation status: {str(e)}")


async def trigger_url_validation(url: str, product_id: UUID, background_tasks: Optional[BackgroundTasks] = None) -> str:
    """
    Trigger the URL validation in the task manager service.
    
    Args:
        url: The URL to validate
        product_id: The ID of the product this URL belongs to
        background_tasks: Optional BackgroundTasks for background processing
        
    Returns:
        The task ID from the task manager service or None if the service is unavailable
    """
    try:
        # Use asyncio.to_thread to run synchronous request in a separate thread
        response = await asyncio.to_thread(
            requests.post,
            f"{TASK_MANAGER_URL}/validate-url/",
            json={"url": url}
        )
        response.raise_for_status()
        result = response.json()
        task_id = result.get("task_id")
        
        if task_id and background_tasks:
            # Add a background task to poll the status
            background_tasks.add_task(poll_url_validation_status, task_id, product_id)
            
        logger.info(f"URL validation started for product {product_id} with task ID: {task_id}")
        return task_id
    except requests.ConnectionError as e:
        # Log the error but don't fail the product creation
        logger.warning(f"Task manager service unavailable. URL validation skipped for product {product_id}: {str(e)}")
        return None
    except requests.HTTPError as e:
        # Log the error
        logger.error(f"Error triggering URL validation for product {product_id}: {str(e)}")
        return None
    except Exception as e:
        # Catch any other exceptions to prevent product creation from failing
        logger.error(f"Unexpected error during URL validation for product {product_id}: {str(e)}")
        return None


async def poll_url_validation_status(task_id: str, product_id: UUID, max_attempts: int = 60, interval: int = 5):
    """
    Poll the task manager for URL validation status updates.
    This function is meant to be used with FastAPI BackgroundTasks.

    Args:
        task_id: Task ID from the task manager
        product_id: ID of the product this URL belongs to
        max_attempts: Maximum number of polling attempts before giving up
        interval: Interval between polls in seconds
    """
    attempts = 0

    while attempts < max_attempts:
        try:
            # Sleep first to give the task manager time to process
            await asyncio.sleep(interval)
            
            # Check task status using asyncio.to_thread
            response = await asyncio.to_thread(
                requests.get,
                f"{TASK_MANAGER_URL}/validate-url/status/{task_id}"
            )
            
            if response.status_code == 404:
                logger.error(f"Failed to get URL validation status for task: {task_id}")
                break

            if response.status_code != 200:
                logger.error(f"Failed to get URL validation status ({response.status_code}): {response.text}")
                attempts += 1
                continue

            status_data = response.json()
            status = status_data.get("status")
            
            # If the task is completed or failed, we're done
            if status in ["completed", "error"]:
                logger.info(f"URL validation task {task_id} for product {product_id} finished with status: {status}")
                
                # Here you could add additional logic to handle the validation results
                # For example, update the product with the login page URL if one was found
                if status == "completed" and status_data.get("login_url"):
                    logger.info(f"Login URL found for product {product_id}: {status_data.get('login_url')}")
                    # You could update the product here if needed
                
                break
            
            # Continue polling
            logger.debug(f"URL validation task {task_id} for product {product_id} status: {status}")
            attempts += 1
            
        except requests.ConnectionError as e:
            logger.warning(f"Task manager unavailable when polling status for task {task_id}: {str(e)}")
            attempts += 1
            # Add a longer sleep on connection errors to avoid overwhelming logs
            await asyncio.sleep(interval * 2)
        except requests.HTTPError as e:
            logger.error(f"Error polling URL validation status for task {task_id}: {str(e)}")
            attempts += 1
        except Exception as e:
            logger.error(f"Unexpected error polling URL validation status for task {task_id}: {str(e)}")
            attempts += 1

    if attempts >= max_attempts:
        logger.warning(f"Gave up polling URL validation status for task {task_id} after {max_attempts} attempts")


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
        task_id = await trigger_url_validation(updated_product.url, product_id, background_tasks)
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
    background_tasks: BackgroundTasks,
    request: dict = Body(..., example={"url": "https://example.com"}),
    current_user=Depends(get_current_user_dependency)
) -> dict:
    """
    Directly validate a URL without creating a product.
    
    This endpoint triggers the task-manager's URL validation service
    and returns a task ID for tracking the validation process.
    
    If the task manager service is unavailable, it will return an appropriate message
    rather than failing.
    """
    if not request.get("url"):
        raise HTTPException(status_code=400, detail="URL is required")
    
    url = request.get("url")
    
    # Generate a random UUID to associate with this validation request
    temp_id = uuid.uuid4()
    
    # Trigger validation in the task-manager with background tasks
    task_id = await trigger_url_validation(url, temp_id, background_tasks)
    
    if not task_id:
        # Instead of a 500 error, return a 202 Accepted with a message
        # that validation couldn't be performed but the request was valid
        return {
            "status": "unavailable",
            "message": "URL validation service is currently unavailable, but the request was accepted",
            "url": url
        }
    
    return {"task_id": task_id, "status": "pending"}
