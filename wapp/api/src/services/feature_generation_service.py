import os
import asyncio
import logging
import requests
from fastapi import HTTPException, BackgroundTasks
from typing import List, Dict, Any, Optional
from pydantic import UUID4

from dto.models import Epic as EpicModel, Product as ProductModel
from dto.schemas import FeatureCreate as FeatureCreateSchema, SecretType
from services.feature_services import create_feature
from services.secret_services import get_organization_secrets, get_secret_with_values
from services.crypto_service import crypto_service

# Configure logging
logger = logging.getLogger(__name__)

async def generate_features(epic_id: UUID4, background_tasks: Optional[BackgroundTasks] = None) -> str:
    """
    Trigger feature generation for an epic in the task-manager.

    Args:
        epic_id: UUID of the epic to generate features for
        background_tasks: FastAPI BackgroundTasks for background processing

    Returns:
        Task ID for tracking the generation status

    Raises:
        HTTPException: If there is an error fetching data or communicating with the task manager
    """
    # Fetch the epic and its related data
    epic = await EpicModel.get_or_none(id=epic_id)

    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found")

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
        }
    }

    # Build dictionary of all secrets with their decrypted values
    all_secrets = {}

    # Get the organization ID from the product (if available)
    organization_id = product.organization_id
    if organization_id:
        # Get all secrets for this organization
        org_secrets = await get_organization_secrets(organization_id)

        # Add all organization secrets to the dictionary
        for secret in org_secrets:
            try:
                # Get the secret with its values
                secret_with_values = await get_secret_with_values(secret.id)

                # Skip if no values
                if not secret_with_values or not hasattr(secret_with_values, 'values'):
                    continue

                # If this is the first secret of this type, create a new entry
                if secret_with_values.type not in all_secrets:
                    all_secrets[secret_with_values.type] = {}

                # Add values to the result
                for key, value in secret_with_values.values.items():
                    # For username_password type, store directly
                    if secret_with_values.type == SecretType.USERNAME_PASSWORD:
                        all_secrets[secret_with_values.type][key] = value
                    else:
                        # For other types, prefix with secret name to avoid conflicts
                        prefixed_key = f"{secret_with_values.name}_{key}"
                        all_secrets[secret_with_values.type][prefixed_key] = value
            except Exception as e:
                logger.warning(f"Failed to get secret {secret.id}: {str(e)}")

    # Add encrypted secrets to the payload if available
    if all_secrets:
        # Encrypt the secrets using the task-manager's public key
        encryption_success, encrypted_secrets = crypto_service.encrypt_secrets(all_secrets)

        if not (encryption_success and encrypted_secrets):
            error_msg = "Encryption failed, aborting feature generation for security reasons"
            logger.error(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)

        # Add the encrypted secrets to the payload
        payload['encrypted_secrets'] = encrypted_secrets
        logger.info("Successfully encrypted secrets for feature generation")

    # Send request to task manager
    try:
        response = requests.post(
            os.getenv("TASK_MANAGER_URL") + "/generate-features/",
            json=payload
        )

        if response.status_code != 200:
            logger.error(f"Failed to trigger feature generation ({response.status_code}): {response.text}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to trigger feature generation: {response.text}"
            )

        task_id = response.json()

        # Start a background task to check status periodically if BackgroundTasks is provided
        if background_tasks:
            background_tasks.add_task(
                poll_task_manager_status,
                epic_id=epic_id,
                task_id=task_id
            )

        return task_id

    except requests.RequestException as e:
        logger.error(f"Error connecting to task manager: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error connecting to task manager: {str(e)}")


async def get_feature_generation_status(task_id: str) -> Dict[str, Any]:
    """
    Get the status of a feature generation task.

    Args:
        task_id: Task ID from the task manager

    Returns:
        Dictionary with task status information

    Raises:
        HTTPException: If there is an error communicating with the task manager
    """
    try:
        response = requests.get(
            os.getenv("TASK_MANAGER_URL") + f"/generate-features/status/{task_id}"
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


async def poll_task_manager_status(epic_id: UUID4, task_id: str, max_attempts: int = 60, interval: int = 10) -> None:
    """
    Poll the task manager for status updates and save generated features.

    Args:
        epic_id: ID of the epic to add features to
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
            status_data = await get_feature_generation_status(task_id)

            # If the task is completed, process the results
            if status_data["status"] == "completed" and status_data.get("results"):
                # Create features from the results
                await process_generated_features(epic_id, status_data["results"])
                logger.info(f"Successfully processed features for epic {epic_id}")
                break

            elif status_data["status"] == "error":
                # Log the error and break out of the loop
                logger.error(f"Feature generation failed: {status_data.get('error', 'Unknown error')}")
                break

            # If still pending, continue polling
            attempts += 1

        except Exception as e:
            logger.error(f"Error polling task manager status: {str(e)}")
            attempts += 1

    # If we've exhausted attempts, log timeout
    if attempts >= max_attempts:
        logger.error(f"Timed out waiting for feature generation to complete for epic {epic_id}")


async def process_generated_features(epic_id: UUID4, features_list: List[dict]) -> None:
    """
    Process and save the generated features to the database.

    Args:
        epic_id: ID of the epic to add features to
        features_list: List of feature dictionaries from the task manager
    """
    for feature in features_list:
        try:
            # Create the feature
            feature_data = FeatureCreateSchema(
                name=feature["name"],
                description=feature["description"],
                urls=feature["urls"],
                epic_id=epic_id
            )
            
            # Save to database
            await create_feature(feature_data)
            logger.info(f"Created feature: {feature['name']}")
            
        except Exception as e:
            logger.error(f"Error creating feature '{feature.get('name', 'Unknown')}': {str(e)}")
            continue 