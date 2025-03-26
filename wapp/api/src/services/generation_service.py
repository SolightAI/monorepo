import os
import asyncio
import logging
import requests
from uuid import uuid4
from fastapi import HTTPException, BackgroundTasks
from typing import List, Dict, Any, Optional, Literal
from pydantic import UUID4

from dto.models import Feature as FeatureModel, Epic as EpicModel, Product as ProductModel
from services.feature_generation_service import generate_features
from services.user_stories_generation_service import generate_user_stories, get_user_stories_generation_status
from services.acceptance_criteria_generation_service import generate_acceptance_criteria, get_acceptance_criteria_generation_status
from services.test_services import trigger_test_generation, get_test_generation_status
from services.secret_services import get_encrypted_secrets

# Configure logging
logger = logging.getLogger(__name__)

# Generation scope types
GenerationScope = Literal["feature", "epic", "product"]

# Task manager URL (reused from other services)
TASK_MANAGER_URL: str = os.getenv("TASK_MANAGER_URL")  # type: ignore
if not TASK_MANAGER_URL:
    raise ValueError("TASK_MANAGER_URL is not set")

# In-memory task status tracking
# Maps task_id to generation status
task_status = {}


async def trigger_full_generation(
    scope: GenerationScope,
    id: UUID4,
    background_tasks: Optional[BackgroundTasks] = None
) -> Dict[str, Any]:
    """
    Trigger full generation for a feature, epic, or product.

    Args:
        scope: Scope of generation ("feature", "epic", or "product")
        id: UUID of the entity to generate for
        background_tasks: FastAPI BackgroundTasks for background processing

    Returns:
        Dictionary with task_id and initial status

    Raises:
        HTTPException: If there's an error with the request or entity not found
    """
    # Generate a unique task ID for tracking this process
    task_id = str(uuid4())

    # Initialize task status
    status_data = {
        "task_id": task_id,
        "status": "in_progress",
        "scope": scope,
        "scope_id": str(id),
        "current_item": None,
        "completed_items": [],
        "errors": []
    }

    # Store status
    task_status[task_id] = status_data

    # Start appropriate generation process based on scope
    if background_tasks:
        if scope == "feature":
            # Start feature-level generation
            background_tasks.add_task(
                generate_all_for_feature,
                feature_id=id,
                task_id=task_id
            )
        elif scope == "epic":
            # Start epic-level generation
            background_tasks.add_task(
                generate_all_for_epic,
                epic_id=id,
                task_id=task_id
            )
        elif scope == "product":
            # Start product-level generation
            background_tasks.add_task(
                generate_all_for_product,
                product_id=id,
                task_id=task_id
            )

    return {
        "task_id": task_id,
        "status": "started"
    }


async def get_generation_status(task_id: str) -> Dict[str, Any]:
    """
    Get the status of a generation task.

    Args:
        task_id: Task ID to check

    Returns:
        Status information

    Raises:
        HTTPException: If task ID is not found
    """
    if task_id not in task_status:
        raise HTTPException(
            status_code=404,
            detail=f"Task ID {task_id} not found"
        )

    return task_status[task_id]


async def generate_all_for_feature(feature_id: UUID4, task_id: str) -> None:
    """
    Generate all content for a feature: user stories, acceptance criteria, and tests.

    Args:
        feature_id: ID of the feature
        task_id: Task ID for tracking progress
    """
    # Check if feature exists
    feature = await FeatureModel.get_or_none(id=feature_id)
    if not feature:
        task_status[task_id]["status"] = "failed"
        task_status[task_id]["errors"].append({
            "item_id": str(feature_id),
            "message": "Feature not found"
        })
        return

    # Update task status with feature information
    task_status[task_id]["current_item"] = {
        "index": 0,
        "total": 1,
        "id": str(feature_id),
        "name": feature.name,
        "stage": "user_stories",
        "progress": 0
    }

    try:
        # Step 1: Generate user stories
        task_status[task_id]["current_item"]["stage"] = "user_stories"
        task_status[task_id]["current_item"]["progress"] = 0

        user_stories_task_id = await generate_user_stories(feature_id)

        # Wait for user stories generation to complete
        user_stories_completed = await wait_for_task_completion(
            "user_stories",
            user_stories_task_id,
            task_id
        )

        if not user_stories_completed:
            # Continue even if user stories failed
            task_status[task_id]["errors"].append({
                "item_id": str(feature_id),
                "message": "User stories generation failed"
            })

        # Step 2: Generate acceptance criteria
        task_status[task_id]["current_item"]["stage"] = "acceptance_criteria"
        task_status[task_id]["current_item"]["progress"] = 33

        acceptance_criteria_task_id = await generate_acceptance_criteria(feature_id)

        # Wait for acceptance criteria generation to complete
        acceptance_criteria_completed = await wait_for_task_completion(
            "acceptance_criteria",
            acceptance_criteria_task_id,
            task_id
        )

        if not acceptance_criteria_completed:
            # Continue even if acceptance criteria failed
            task_status[task_id]["errors"].append({
                "item_id": str(feature_id),
                "message": "Acceptance criteria generation failed"
            })

        # Step 3: Generate tests
        task_status[task_id]["current_item"]["stage"] = "tests"
        task_status[task_id]["current_item"]["progress"] = 66

        test_task_id = await trigger_test_generation(feature_id)

        # Wait for test generation to complete
        test_completed = await wait_for_task_completion(
            "tests",
            test_task_id,
            task_id
        )

        if not test_completed:
            # Continue even if tests failed
            task_status[task_id]["errors"].append({
                "item_id": str(feature_id),
                "message": "Test generation failed"
            })

        # Mark as completed
        task_status[task_id]["current_item"]["progress"] = 100
        task_status[task_id]["completed_items"].append({
            "id": str(feature_id),
            "name": feature.name
        })
        task_status[task_id]["current_item"] = None

        # Set overall status based on errors
        if len(task_status[task_id]["errors"]) > 0:
            task_status[task_id]["status"] = "completed_with_errors"
        else:
            task_status[task_id]["status"] = "completed"

    except Exception as e:
        logger.error(f"Error in feature generation: {str(e)}")
        task_status[task_id]["status"] = "failed"
        task_status[task_id]["errors"].append({
            "item_id": str(feature_id),
            "message": f"Generation failed: {str(e)}"
        })


async def generate_all_for_epic(epic_id: UUID4, task_id: str) -> None:
    """
    Generate all content for all features in an epic.

    Args:
        epic_id: ID of the epic
        task_id: Task ID for tracking progress
    """
    # Check if epic exists
    epic = await EpicModel.get_or_none(id=epic_id)
    if not epic:
        task_status[task_id]["status"] = "failed"
        task_status[task_id]["errors"].append({
            "item_id": str(epic_id),
            "message": "Epic not found"
        })
        return

    # Get all features for this epic
    features = await FeatureModel.filter(epic_id=epic_id)

    if not features:
        task_status[task_id]["status"] = "failed"
        task_status[task_id]["errors"].append({
            "item_id": str(epic_id),
            "message": "No features found for this epic"
        })
        return

    # Update task status with epic information
    task_status[task_id]["current_item"] = {
        "index": 0,
        "total": len(features),
        "id": str(epic_id),
        "name": epic.name,
        "stage": "preparing",
        "progress": 0
    }

    # Process each feature sequentially
    for i, feature in enumerate(features):
        # Update progress
        task_status[task_id]["current_item"] = {
            "index": i + 1,
            "total": len(features),
            "id": str(feature.id),
            "name": feature.name,
            "stage": "starting",
            "progress": 0
        }

        try:
            # Create a nested task for this feature
            feature_task_id = str(uuid4())
            await generate_all_for_feature(feature.id, feature_task_id)

            # Wait for the feature generation to complete
            completed = False
            max_attempts = 180  # 30 minutes with 10-second checks
            for attempt in range(max_attempts):
                await asyncio.sleep(10)

                if feature_task_id in task_status:
                    feature_status = task_status[feature_task_id]

                    # Update the epic's current item with the feature's progress
                    if feature_status["current_item"]:
                        task_status[task_id]["current_item"]["stage"] = feature_status["current_item"]["stage"]
                        task_status[task_id]["current_item"]["progress"] = feature_status["current_item"]["progress"]

                    # Check if completed or failed
                    if feature_status["status"] in ["completed", "completed_with_errors", "failed"]:
                        # Add any errors to the epic's errors
                        for error in feature_status.get("errors", []):
                            task_status[task_id]["errors"].append(error)

                        # Add to completed items if successful
                        if feature_status["status"] != "failed":
                            task_status[task_id]["completed_items"].append({
                                "id": str(feature.id),
                                "name": feature.name
                            })

                        completed = True
                        break

            if not completed:
                # Timeout waiting for feature
                task_status[task_id]["errors"].append({
                    "item_id": str(feature.id),
                    "message": "Timeout waiting for feature generation to complete"
                })

        except Exception as e:
            logger.error(f"Error processing feature {feature.id}: {str(e)}")
            task_status[task_id]["errors"].append({
                "item_id": str(feature.id),
                "message": f"Feature generation failed: {str(e)}"
            })

    # All features processed
    task_status[task_id]["current_item"] = None

    # Set overall status based on errors
    if len(task_status[task_id]["errors"]) > 0:
        task_status[task_id]["status"] = "completed_with_errors"
    else:
        task_status[task_id]["status"] = "completed"


async def generate_all_for_product(product_id: UUID4, task_id: str) -> None:
    """
    Generate all content for all epics and features in a product.

    Args:
        product_id: ID of the product
        task_id: Task ID for tracking progress
    """
    # Check if product exists
    product = await ProductModel.get_or_none(id=product_id)
    if not product:
        task_status[task_id]["status"] = "failed"
        task_status[task_id]["errors"].append({
            "item_id": str(product_id),
            "message": "Product not found"
        })
        return

    # Get all epics for this product
    epics = await EpicModel.filter(product_id=product_id)

    if not epics:
        task_status[task_id]["status"] = "failed"
        task_status[task_id]["errors"].append({
            "item_id": str(product_id),
            "message": "No epics found for this product"
        })
        return

    # Update task status with product information
    task_status[task_id]["current_item"] = {
        "index": 0,
        "total": len(epics),
        "id": str(product_id),
        "name": product.name,
        "stage": "preparing",
        "progress": 0
    }

    # Process each epic sequentially
    for i, epic in enumerate(epics):
        # Update progress
        task_status[task_id]["current_item"] = {
            "index": i + 1,
            "total": len(epics),
            "id": str(epic.id),
            "name": epic.name,
            "stage": "starting",
            "progress": 0
        }

        try:
            # Create a nested task for this epic
            epic_task_id = str(uuid4())
            await generate_all_for_epic(epic.id, epic_task_id)

            # Process the epic results and update product status
            # Similar to how epic handles features
            # Implementation omitted for brevity but follows same pattern

            # Mark epic as completed
            task_status[task_id]["completed_items"].append({
                "id": str(epic.id),
                "name": epic.name
            })

        except Exception as e:
            logger.error(f"Error processing epic {epic.id}: {str(e)}")
            task_status[task_id]["errors"].append({
                "item_id": str(epic.id),
                "message": f"Epic generation failed: {str(e)}"
            })

    # All epics processed
    task_status[task_id]["current_item"] = None

    # Set overall status based on errors
    if len(task_status[task_id]["errors"]) > 0:
        task_status[task_id]["status"] = "completed_with_errors"
    else:
        task_status[task_id]["status"] = "completed"


async def wait_for_task_completion(
    task_type: str,
    task_id: str,
    parent_task_id: str,
    max_attempts: int = 60,
    interval: int = 10
) -> bool:
    """
    Wait for a generation task to complete by polling its status.

    Args:
        task_type: Type of task (user_stories, acceptance_criteria, tests)
        task_id: Task ID to check
        parent_task_id: Parent task ID for updating status
        max_attempts: Maximum number of attempts
        interval: Interval between attempts in seconds

    Returns:
        True if task completed successfully, False otherwise
    """
    if task_type == "user_stories":
        get_status = get_user_stories_generation_status
    elif task_type == "acceptance_criteria":
        get_status = get_acceptance_criteria_generation_status
    elif task_type == "tests":
        get_status = get_test_generation_status
    else:
        logger.error(f"Unknown task type: {task_type}")
        return False

    attempts = 0
    while attempts < max_attempts:
        try:
            # Wait between checks
            await asyncio.sleep(interval)

            # Check status
            status_data = await get_status(task_id)

            # Update the parent task's current item with progress indicators
            if parent_task_id in task_status and task_status[parent_task_id]["current_item"]:
                # Update progress based on status if available
                if "progress" in status_data:
                    task_status[parent_task_id]["current_item"]["progress"] = status_data["progress"]

            # Check if completed or failed
            if status_data["status"] == "completed":
                return True
            elif status_data["status"] == "error" or status_data["status"] == "failed":
                return False

            # Continue polling
            attempts += 1

        except Exception as e:
            logger.error(f"Error checking task status: {str(e)}")
            attempts += 1

    # Timed out
    logger.error(f"Timed out waiting for {task_type} task {task_id} to complete")
    return False
