import logging

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from dto.schemas import ProductCreate as ProductCreateSchema, Product as ProductSchema, ProductUpdate as ProductUpdateSchema, TestStatus
from services.product_services import get_product, create_product, get_products_list, delete_product, update_product
from services import organization_services
from pydantic import UUID4
from typing import List
from uuid import UUID
from dependencies import get_current_user_dependency
from arq.jobs import Job, JobStatus
from utils.redis_manager import get_redis_pool


router = APIRouter(prefix="/products", tags=["products"], dependencies=[Depends(get_current_user_dependency)])


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
    current_user=Depends(get_current_user_dependency)
) -> dict:
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

    # Create the product
    created_product = await create_product(product)

    # Convert the Tortoise ORM model to a dictionary
    # Since model_dump() isn't available, use proper serialization method
    result_dict = dict(created_product)

    # Validate URL in background
    task_id = await trigger_url_validation(created_product.url)
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

    redis = await get_redis_pool()
    job = Job(str(task_id), redis=redis)
    job_status = await job.status()

    logger.info(f"URL validation status for job {task_id}: {job_status}")

    if job_status == JobStatus.complete:
        try:
            return {"status": TestStatus.PASSED.value, "results": await job.result()}
        except Exception as e:
            return {
                "status": TestStatus.ERROR.value,
                "error": str(e)
            }
    elif job_status == JobStatus.not_found:
        return {
            "status": TestStatus.ERROR.value,
            "error": "Job not found"
        }
    else:
        return {
            "status": job_status.value
        }


async def trigger_url_validation(url: str) -> str:
    """
    Trigger the URL validation in the task manager service.

    Args:
        url: The URL to validate
        product_id: The ID of the product this URL belongs to

    Returns:
        The task ID from the task manager service or None if the service is unavailable
    """

    redis = await get_redis_pool()

    job = await redis.enqueue_job('validate_url', url=url)

    task_id = job.job_id

    return task_id


@router.put("/{product_id}")
async def update_product_endpoint(
    product_id: UUID4,
    product_data: ProductUpdateSchema,
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
        task_id = await trigger_url_validation(updated_product.url)
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
    url: str = Body(..., examples=[{"url": "https://example.com"}]),
) -> dict:
    """
    Directly validate a URL without creating a product.

    This endpoint triggers the task-manager's URL validation service
    and returns a task ID for tracking the validation process.

    If the task manager service is unavailable, it will return an appropriate message
    rather than failing.
    """
    return {"task_id": await trigger_url_validation(url), "status": "pending"}
