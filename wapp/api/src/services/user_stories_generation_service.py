import os
import asyncio
import logging
import requests

from fastapi import HTTPException, BackgroundTasks
from typing import List, Dict, Any, Optional
from pydantic import UUID4
from dto.models import Feature as FeatureModel, Product as ProductModel
from dto.schemas import UserStoryCreate as UserStoryCreateSchema
from services.user_story_services import create_user_story
from services.secret_services import get_encrypted_secrets


TASK_MANAGER_URL: str = os.getenv("TASK_MANAGER_URL")  # type: ignore


if not TASK_MANAGER_URL:
    raise ValueError("TASK_MANAGER_URL is not set")


# Configure logging
logger = logging.getLogger(__name__)


async def generate_user_stories(feature_id: UUID4, background_tasks: Optional[BackgroundTasks] = None) -> str:
    """
    Trigger user stories generation for a feature in the task-manager.

    Args:
        feature_id: UUID of the feature to generate user stories for
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
            "dependents": [],
            "dependencies": []
        }
    }

    # Add encrypted secrets to the payload if available
    encrypted_secrets = await get_encrypted_secrets(product.organization_id, product.id)
    if encrypted_secrets:
        payload['encrypted_secrets'] = encrypted_secrets
        logger.info("Successfully encrypted secrets for user stories generation")

    # Send request to task manager
    try:
        response = requests.post(
            TASK_MANAGER_URL + "/generate-user-stories/",
            json=payload
        )

        if response.status_code != 200:
            logger.error(f"Failed to trigger user stories generation ({response.status_code}): {response.text}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to trigger user stories generation: {response.text}"
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


async def get_user_stories_generation_status(task_id: str) -> Dict[str, Any]:
    """
    Get the status of a user stories generation task.

    Args:
        task_id: Task ID from the task manager

    Returns:
        Dictionary with task status information

    Raises:
        HTTPException: If there is an error communicating with the task manager
    """
    try:
        response = requests.get(
            TASK_MANAGER_URL + f"/generate-user-stories/status/{task_id}"
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
    Poll the task manager for status updates and save generated user stories.

    Args:
        feature_id: ID of the feature to add user stories to
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
            status_data = await get_user_stories_generation_status(task_id)

            # If the task is completed, process the results
            if status_data["status"] == "completed" and status_data.get("results"):
                # Create user stories from the results
                await process_generated_user_stories(feature_id, status_data["results"])
                logger.info(f"Successfully processed user stories for feature {feature_id}")
                break

            elif status_data["status"] == "error":
                # Log the error and break out of the loop
                logger.error(f"User stories generation failed: {status_data.get('error', 'Unknown error')}")
                break

            # If still pending, continue polling
            attempts += 1

        except Exception as e:
            logger.error(f"Error polling task manager status: {str(e)}")
            attempts += 1

    # If we've exhausted attempts, log timeout
    if attempts >= max_attempts:
        logger.error(f"Timed out waiting for user stories generation to complete for feature {feature_id}")


async def process_generated_user_stories(feature_id: UUID4, user_stories: List[dict[str, str]]) -> None:
    """
    Process and save the generated user stories to the database.

    Args:
        feature_id: ID of the feature to add user stories to
        user_stories: List of user story strings from the task manager
    """
    for user_story in user_stories:
        try:
            # Create the user story
            user_story_data = UserStoryCreateSchema(
                feature_id=feature_id,
                name=user_story["name"],
                description=""  # The task manager only returns the story text, not a separate description
            )

            await create_user_story(user_story_data)

        except Exception as e:
            logger.error(f"Error creating user story: {str(e)}")
            raise e
