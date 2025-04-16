import os
import asyncio
import logging
import requests

from fastapi import HTTPException, BackgroundTasks
from dto.models import AcceptanceCriteria as AcceptanceCriteriaModel, Feature as FeatureModel, Product as ProductModel, UserStory as UserStoryModel
from dto.schemas import AcceptanceCriteria as AcceptanceCriteriaSchema, AcceptanceCriteriaCreate as AcceptanceCriteriaCreateSchema, AcceptanceCriteriaUpdate as AcceptanceCriteriaUpdateSchema
from uuid import UUID
from pydantic import UUID4
from typing import List, Dict, Any, Optional
from services.secret_services import get_encrypted_secrets


TASK_MANAGER_URL: str = os.getenv("TASK_MANAGER_URL")  # type: ignore


if not TASK_MANAGER_URL:
    raise ValueError("TASK_MANAGER_URL is not set")


logger = logging.getLogger(__name__)


async def get_all_acceptance_criteria() -> list[AcceptanceCriteriaSchema]:
    return await AcceptanceCriteriaModel.all()


async def get_acceptance_criteria(acceptance_criteria_id: str) -> AcceptanceCriteriaSchema:
    acceptance_criteria = await AcceptanceCriteriaModel.get_or_none(id=acceptance_criteria_id)

    if not acceptance_criteria:
        raise HTTPException(status_code=404, detail="Acceptance criteria not found")

    return acceptance_criteria


async def get_acceptance_criteria_by_feature(feature_id: UUID) -> list[AcceptanceCriteriaSchema]:
    """
    Get all acceptance criteria for a feature.

    Args:
        feature_id: UUID of the feature

    Returns:
        List of acceptance criteria for the feature
    """
    return await AcceptanceCriteriaModel.filter(feature_id=feature_id)


async def create_acceptance_criteria(acceptance_criteria: AcceptanceCriteriaCreateSchema) -> AcceptanceCriteriaSchema:
    acceptance_criteria_model = await AcceptanceCriteriaModel.create(**acceptance_criteria.model_dump())

    return await get_acceptance_criteria(acceptance_criteria_model.id)  # NOTE: a bit dirty, but it works (prevents issue with ManyToManyField)


async def delete_acceptance_criteria(acceptance_criteria_id: str | UUID) -> bool:
    """
    Delete an acceptance criteria.

    Args:
        acceptance_criteria_id: UUID of the acceptance criteria to delete

    Returns:
        True if the acceptance criteria was deleted, False otherwise

    Raises:
        HTTPException: If the acceptance criteria was not found
    """
    acceptance_criteria = await AcceptanceCriteriaModel.get_or_none(id=acceptance_criteria_id)

    if not acceptance_criteria:
        raise HTTPException(status_code=404, detail="Acceptance criteria not found")

    # Delete the acceptance criteria
    await acceptance_criteria.delete()

    return True


async def update_acceptance_criteria(acceptance_criteria_id: UUID4, acceptance_criteria_update: AcceptanceCriteriaUpdateSchema) -> AcceptanceCriteriaModel:
    """
    Update acceptance criteria with the provided data.

    Args:
        acceptance_criteria_id: UUID of the acceptance criteria to update
        acceptance_criteria_update: Data to update the acceptance criteria with

    Returns:
        The updated acceptance criteria

    Raises:
        HTTPException: If the acceptance criteria was not found
    """
    acceptance_criteria = await AcceptanceCriteriaModel.get_or_none(id=acceptance_criteria_id)

    if not acceptance_criteria:
        raise HTTPException(status_code=404, detail="Acceptance criteria not found")

    # Update only provided fields
    update_data = acceptance_criteria_update.model_dump(exclude_unset=True, exclude_none=True)

    if update_data:
        for key, value in update_data.items():
            setattr(acceptance_criteria, key, value)

        await acceptance_criteria.save()

    return await get_acceptance_criteria(acceptance_criteria_id)  # Return the full acceptance criteria with related entities


async def generate_acceptance_criteria(feature_id: UUID4, background_tasks: Optional[BackgroundTasks] = None) -> str:
    """
    Trigger acceptance criteria generation for a feature in the task-manager.

    Args:
        feature_id: UUID of the feature to generate acceptance criteria for
        background_tasks: FastAPI BackgroundTasks for background processing

    Returns:
        Task ID for tracking the generation status

    Raises:
        HTTPException: If there is an error fetching data or communicating with the task manager
    """
    # Fetch the feature and its related data
    feature = await FeatureModel.get_or_none(id=feature_id).prefetch_related('epic')

    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")

    epic = feature.epic
    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found for the feature")

    product = await ProductModel.get_or_none(id=epic.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found for the epic")

    # Fetch user stories for this feature
    user_stories = await UserStoryModel.filter(feature_id=feature_id)

    if not user_stories:
        raise HTTPException(status_code=400, detail="No user stories found for this feature. Generate user stories first.")

    # Prepare the payload for the task manager
    payload = {
        "product": {
            "url": product.url,
            "name": product.name,
            "description": product.description,
            "documentation": product.documentation or "",
            "links_to_documentation": product.links_to_documentation or []
        },
        "epic": {
            "name": epic.name,
            "description": epic.description
        },
        "feature": {
            "id": str(feature.id),
            "urls": feature.urls,
            "name": feature.name,
            "description": feature.description,
        },
        "user_stories": [
            {
                "id": str(user_story.id),
                "name": user_story.name,
                "description": user_story.description
            }
            for user_story in user_stories
        ]
    }

    # Add encrypted secrets to the payload if available
    encrypted_secrets = await get_encrypted_secrets(product.organization_id, product.id)
    if encrypted_secrets:
        payload['encrypted_secrets'] = encrypted_secrets
        logger.info("Successfully encrypted secrets for acceptance criteria generation")

    # Send request to task manager
    try:
        response = requests.post(
            TASK_MANAGER_URL + "/generate-acceptance-criteria/",
            json=payload
        )

        if response.status_code != 200:
            logger.error(f"Failed to trigger acceptance criteria generation ({response.status_code}): {response.text}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to trigger acceptance criteria generation: {response.text}"
            )

        task_id = response.json()

        # Start a background task to check status periodically if BackgroundTasks is provided
        if background_tasks:
            background_tasks.add_task(
                poll_task_manager_status,
                feature_id=feature_id,
                task_id=task_id
            )

        return task_id

    except requests.RequestException as e:
        logger.error(f"Error connecting to task manager: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error connecting to task manager: {str(e)}")


async def get_acceptance_criteria_generation_status(task_id: str) -> Dict[str, Any]:
    """
    Get the status of an acceptance criteria generation task.

    Args:
        task_id: Task ID from the task manager

    Returns:
        Dictionary with task status information

    Raises:
        HTTPException: If there is an error communicating with the task manager
    """
    try:
        response = requests.get(
            TASK_MANAGER_URL + f"/generate-acceptance-criteria/status/{task_id}"
        )

        if response.status_code != 200:
            logger.error(f"Failed to get task status ({response.status_code}): {response.text}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to get task status: {response.text}"
            )

        return response.json()

    except requests.RequestException as e:
        logger.error(f"Error connecting to task manager: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error connecting to task manager: {str(e)}")


async def poll_task_manager_status(feature_id: UUID4, task_id: str, max_attempts: int = 120, interval: int = 5) -> None:
    """
    Poll the task manager for status updates and save generated acceptance criteria.

    Args:
        feature_id: ID of the feature to add acceptance criteria to
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
            status_data = await get_acceptance_criteria_generation_status(task_id)

            # If the task is completed, process the results
            if status_data["status"] == "completed" and status_data.get("results"):
                # Create acceptance criteria from the results
                await process_generated_acceptance_criteria(feature_id, status_data["results"])
                logger.info(f"Successfully processed acceptance criteria for feature {feature_id}")
                break

            elif status_data["status"] == "error":
                # Log the error and break out of the loop
                logger.error(f"Acceptance criteria generation failed: {status_data.get('error', 'Unknown error')}")
                break

            # If still pending, continue polling
            attempts += 1

        except Exception as e:
            logger.error(f"Error polling task manager status: {str(e)}")
            attempts += 1

    # If we've exhausted attempts, log timeout
    if attempts >= max_attempts:
        logger.error(f"Timed out waiting for acceptance criteria generation to complete for feature {feature_id}")


async def process_generated_acceptance_criteria(feature_id: UUID4, acceptance_criteria_list: List[dict]) -> None:
    """
    Process and save the generated acceptance criteria to the database.

    Args:
        feature_id: ID of the feature to add acceptance criteria to
        acceptance_criteria_list: List of acceptance criteria dictionaries from the task manager
    """
    for ac in acceptance_criteria_list:
        try:
            # Create the acceptance criteria
            ac_data = AcceptanceCriteriaCreateSchema(
                feature_id=feature_id,
                name=ac.get("name", ""),
                description=ac.get("description", "")
            )

            await create_acceptance_criteria(ac_data)

        except Exception as e:
            logger.error(f"Error creating acceptance criteria: {str(e)}")
            raise e
