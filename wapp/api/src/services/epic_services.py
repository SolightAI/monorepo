import os
import asyncio
import logging
import requests

from fastapi import HTTPException, BackgroundTasks
from typing import List, Dict, Any, Optional
from dto.models import Epic as EpicModel, Product as ProductModel
from dto.schemas import EpicCreate as EpicCreateSchema, EpicUpdate as EpicUpdateSchema
from pydantic import UUID4
from services.secret_services import get_encrypted_secrets
# services.feature_services is imported later to avoid circular dependency

logger = logging.getLogger(__name__)


async def get_epic(epic_id: UUID4) -> EpicModel:
    epic = await EpicModel.get_or_none(id=epic_id).prefetch_related("features")

    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found")

    return epic


async def create_epic(epic: EpicCreateSchema) -> EpicModel:
    # Check if the product exists first
    product = await ProductModel.get_or_none(id=epic.product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product with ID {epic.product_id} not found")

    epic_model = await EpicModel.create(**epic.model_dump())
    return await get_epic(epic_model.id)  # NOTE: a bit dirty, but it works (prevents issue with ManyToManyField)


async def delete_epic(epic_id: UUID4) -> bool:
    """
    Delete an epic and all its related features.

    Args:
        epic_id: UUID of the epic to delete

    Returns:
        True if the epic was deleted, False otherwise

    Raises:
        HTTPException: If the epic was not found
    """
    epic = await EpicModel.get_or_none(id=epic_id).prefetch_related("features")

    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found")

    # Delete all features related to this epic
    from services.feature_services import delete_feature
    for feature in epic.features:
        await delete_feature(feature.id)

    # Delete the epic
    await epic.delete()

    return True


async def update_epic(epic_id: UUID4, epic_update: EpicUpdateSchema) -> EpicModel:
    """
    Update an epic with the provided data.

    Args:
        epic_id: UUID of the epic to update
        epic_update: Data to update the epic with

    Returns:
        The updated epic

    Raises:
        HTTPException: If the epic was not found
    """
    epic = await EpicModel.get_or_none(id=epic_id)

    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found")

    # Update only provided fields
    update_data = epic_update.model_dump(exclude_unset=True, exclude_none=True)

    if update_data:
        for key, value in update_data.items():
            setattr(epic, key, value)

        await epic.save()

    return await get_epic(epic_id)  # Return the full epic with related entities


async def generate_epics(product_id: UUID4, background_tasks: Optional[BackgroundTasks] = None) -> str:
    """
    Trigger epic generation for a product in the task-manager.

    Args:
        product_id: UUID of the product to generate epics for
        background_tasks: FastAPI BackgroundTasks for background processing

    Returns:
        Task ID for tracking the generation status

    Raises:
        HTTPException: If there is an error fetching data or communicating with the task manager
    """
    raise RuntimeError("Deprecated")
    # Fetch the product data
    product = await ProductModel.get_or_none(id=product_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Prepare the payload for the task manager
    payload = {
        "product": {
            "url": product.url,
            "name": product.name,
            "description": product.description,
            "documentation": product.documentation or "",
            "links_to_documentation": product.links_to_documentation or []
        }
    }

    # Add encrypted secrets to the payload if available
    encrypted_secrets = await get_encrypted_secrets(product.organization_id, product.id)
    if encrypted_secrets:
        payload['encrypted_secrets'] = encrypted_secrets
        logger.info("Successfully encrypted secrets for epic generation")

    # Send request to task manager
    try:
        response = requests.post(
            TASK_MANAGER_URL + "/generate-epics/",
            json=payload
        )

        if response.status_code != 200:
            logger.error(f"Failed to trigger epic generation ({response.status_code}): {response.text}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to trigger epic generation: {response.text}"
            )

        task_id = response.json()

        # Start a background task to check status periodically if BackgroundTasks is provided
        if background_tasks:
            background_tasks.add_task(
                poll_task_manager_status,
                product_id=product_id,
                task_id=task_id
            )

        return task_id

    except requests.RequestException as e:
        logger.error(f"Error connecting to task manager: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error connecting to task manager: {str(e)}")


async def get_epic_generation_status(task_id: str) -> Dict[str, Any]:
    """
    Get the status of an epic generation task.

    Args:
        task_id: Task ID from the task manager

    Returns:
        Dictionary with task status information

    Raises:
        HTTPException: If there is an error communicating with the task manager
    """
    raise RuntimeError("Deprecated")
    try:
        response = requests.get(
            TASK_MANAGER_URL + f"/generate-epics/status/{task_id}"
        )

        if response.status_code != 200:
            logger.error(f"Failed to get task status ({response.status_code}): {response.text}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to get task status: {response.text}"
            )

        response_data = response.json()

        # Ensure that error field is always a string if present
        if response_data.get("error") is not None and not isinstance(response_data["error"], str):
            response_data["error"] = str(response_data["error"])

        return response_data

    except requests.RequestException as e:
        logger.error(f"Error connecting to task manager: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error connecting to task manager: {str(e)}")


async def poll_task_manager_status(product_id: UUID4, task_id: str, max_attempts: int = 120, interval: int = 5) -> None:
    """
    Poll the task manager for status updates and save generated epics.

    Args:
        product_id: ID of the product to add epics to
        task_id: Task ID from the task manager
        max_attempts: Maximum number of polling attempts before giving up
        interval: Interval between polls in seconds
    """
    attempts = 0

    while attempts < max_attempts:
        try:
            # Sleep first to give the task manager time to process
            await asyncio.sleep(interval)

            # Check task status
            status_data = await get_epic_generation_status(task_id)

            # If the task is completed, process the results
            if status_data["status"] == "completed" and status_data.get("results"):
                # Create epics from the results
                await process_generated_epics(product_id, status_data["results"])
                logger.info(f"Successfully processed epics for product {product_id}")
                break

            elif status_data["status"] == "error":
                # Log the error and break out of the loop
                logger.error(f"Epic generation failed: {status_data.get('error', 'Unknown error')}")
                break

            # If still pending, continue polling
            attempts += 1

        except Exception as e:
            logger.error(f"Error polling task manager status: {str(e)}")
            attempts += 1

    # If we've exhausted attempts, log timeout
    if attempts >= max_attempts:
        logger.error(f"Timed out waiting for epic generation to complete for product {product_id}")


async def process_generated_epics(product_id: UUID4, epics_list: List[dict]) -> None:
    """
    Process and save the generated epics to the database.

    Args:
        product_id: ID of the product to add epics to
        epics_list: List of epic dictionaries from the task manager
    """
    for epic in epics_list:
        try:
            # Create the epic
            epic_data = EpicCreateSchema(
                name=epic["name"],
                description=epic["description"],
                product_id=product_id
            )

            # Save to database using the local create_epic function
            await create_epic(epic_data)
            logger.info(f"Created epic: {epic['name']}")

        except Exception as e:
            logger.error(f"Error creating epic '{epic.get('name', 'Unknown')}': {str(e)}")
            continue
