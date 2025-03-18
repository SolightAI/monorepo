from __future__ import annotations
import uuid
import asyncio
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException, BackgroundTasks
from pydantic import UUID4
import requests
import os
import logging

from dto.models import TestExecution as TestExecutionModel, Test as TestModel
from dto.schemas import (
    TestExecutionCreate as TestExecutionCreateSchema,
    TestExecutionUpdate as TestExecutionUpdateSchema,
    TestStatus,
    SecretType
)
from services.test_services import get_test, get_organization_secrets
from services.secret_services import get_secret_with_values

logger = logging.getLogger(__name__)


async def get_test_execution(test_execution_id: UUID4) -> TestExecutionModel:
    """
    Get a test execution by ID.

    Args:
        test_execution_id: UUID of the test execution to get

    Returns:
        The test execution

    Raises:
        HTTPException: If the test execution was not found
    """
    test_execution = await TestExecutionModel.get_or_none(id=test_execution_id).prefetch_related("bugs")

    if not test_execution:
        raise HTTPException(status_code=404, detail="Test execution not found")

    return test_execution


async def get_test_executions_by_test(test_id: UUID4) -> List[TestExecutionModel]:
    """
    Get all test executions for a specific test.

    Args:
        test_id: UUID of the test to get executions for

    Returns:
        List of test executions for the test
    """
    # Verify the test exists
    await get_test(test_id)

    # Get all executions for this test
    test_executions = await TestExecutionModel.filter(test_id=test_id).prefetch_related("bugs")
    return test_executions


# TODO: trigger test execution on task manager
async def create_test_execution(
    test_execution: TestExecutionCreateSchema,
    background_tasks: BackgroundTasks = None
) -> TestExecutionModel:
    """
    Create a new test execution.

    Args:
        test_execution: Data for the test execution to create
        background_tasks: Optional BackgroundTasks for async operations

    Returns:
        The created test execution

    Raises:
        HTTPException: If the test was not found
    """
    # Verify the test exists
    test = await get_test(test_execution.test_id)

    # Create the test execution
    test_execution_dict = test_execution.model_dump()
    test_execution_dict["id"] = uuid.uuid4()
    test_execution_model = await TestExecutionModel.create(**test_execution_dict)

    # Get tzinfo from the existing started_at if available, otherwise use None (system default)
    tzinfo = test.started_at.tzinfo if test.started_at else None

    # Update the test's status
    test.status = test_execution.status
    test.started_at = datetime.now(tzinfo) if not test.started_at else test.started_at

    if test_execution.status in [TestStatus.PASSED, TestStatus.FAILED, TestStatus.BLOCKED, TestStatus.SKIPPED]:
        test.ended_at = datetime.now(tzinfo)

    await test.save()

    # Trigger test execution on task manager if this is an automated test
    try:
        # Get test data and related information
        await test.fetch_related("acceptance_criteria__user_story__feature__epic__product")
        product = test.acceptance_criteria.user_story.feature.epic.product

        # Build dictionary of all secrets with their decrypted values
        all_secrets = {}

        # Get the organization ID from the product (if available)
        organization_id = product.organization_id
        if organization_id:
            # Get all secrets for this organization
            org_secrets = await get_organization_secrets(organization_id)

            # Add all organization secrets to the dictionary
            for secret in org_secrets:
                # Get the secret with its values
                try:
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
                    # Log the error but continue processing other secrets
                    logger.error(f"Error processing secret {secret.id}: {str(e)}")
                    continue

        # Create payload for task manager
        task_manager_payload = {
            "test": {
                "name": test.name,
                "description": test.description,
                "url": test.url,
                "preconditions": test.preconditions,
                "steps": test.steps,
                "expected_results": test.expected_results,
                "assertions": test.assertions
            }
        }

        # Add secrets to the payload if available
        if all_secrets:
            task_manager_payload["secrets"] = all_secrets

        # Send request to task manager
        response = requests.post(
            os.getenv("TASK_MANAGER_URL") + "/run-test/run-test",
            json=task_manager_payload
        )

        if response.status_code != 200:
            logger.error(f"Failed to trigger test execution ({response.status_code}): {response.text}")
            # We don't raise an exception here to avoid failing the test execution creation
            # Instead, we'll update the execution with an error status
            await update_test_execution(
                test_execution_model.id,
                TestExecutionUpdateSchema(
                    status=TestStatus.ERROR,
                    notes=f"Failed to trigger test execution on task manager: {response.text}",
                    ended_at=datetime.now(test_execution_model.started_at.tzinfo if test_execution_model.started_at else None)
                )
            )
        else:
            # Update the execution with the task manager task ID for later status updates
            task_id = response.json()
            await update_test_execution(
                test_execution_model.id,
                TestExecutionUpdateSchema(
                    metadata={"task_manager_task_id": task_id}
                )
            )

            # Start a background task to check status periodically if BackgroundTasks is provided
            if background_tasks:
                background_tasks.add_task(
                    poll_task_manager_status,
                    execution_id=test_execution_model.id,
                    task_id=task_id
                )

    except Exception as e:
        logger.error(f"Error triggering test execution: {str(e)}")
        # Update the execution with an error status
        await update_test_execution(
            test_execution_model.id,
            TestExecutionUpdateSchema(
                status=TestStatus.ERROR,
                notes=f"Error triggering test execution: {str(e)}",
                ended_at=datetime.now(test_execution_model.started_at.tzinfo if test_execution_model.started_at else None)
            )
        )

    return await get_test_execution(test_execution_model.id)


async def poll_task_manager_status(execution_id: UUID4, task_id: str, max_attempts: int = 60, interval: int = 10):
    """
    Poll the task manager for status updates and update the test execution accordingly.
    This is a non-async function for use with FastAPI BackgroundTasks.

    Args:
        execution_id: ID of the test execution to update
        task_id: Task ID from the task manager
        max_attempts: Maximum number of polling attempts before giving up
        interval: Interval between polls in seconds
    """
    attempts = 0

    while attempts < max_attempts:
        try:
            # Sleep first to give the task manager time to process
            await asyncio.sleep(interval)

            # Get the test execution to get its timezone info
            test_execution = await get_test_execution(execution_id)
            tzinfo = test_execution.started_at.tzinfo if test_execution.started_at else None

            # Check task status
            response = requests.get(
                os.getenv("TASK_MANAGER_URL") + f"/run-test/status/{task_id}"
            )

            if response.status_code != 200:
                logger.error(f"Failed to get task status ({response.status_code}): {response.text}")
                attempts += 1
                continue

            status_data = response.json()

            # Update the test execution based on the task status
            if status_data["status"] == "completed":
                # Task completed successfully
                await update_test_execution(
                    execution_id,
                    TestExecutionUpdateSchema(
                        status=TestStatus.PASSED,
                        notes=status_data["results"],
                        ended_at=datetime.now(tzinfo),
                        metadata={}
                    )
                )
                break

            elif status_data["status"] == "error":
                # Task failed
                await update_test_execution(
                    execution_id,
                    TestExecutionUpdateSchema(
                        status=TestStatus.FAILED,
                        notes=f"Test execution failed on task manager: {status_data.get('error', 'Unknown error')}",
                        ended_at=datetime.now(tzinfo),
                        metadata={"error": status_data.get("error"), "traceback": status_data.get("traceback")}
                    )
                )
                break

            # If still pending, continue polling
            attempts += 1

        except Exception as e:
            logger.error(f"Error polling task manager status: {str(e)}")
            attempts += 1

    # If we've exhausted attempts, update the execution as timed out
    if attempts >= max_attempts:
        try:
            # Get the test execution to get its timezone info
            test_execution = await get_test_execution(execution_id)
            tzinfo = test_execution.started_at.tzinfo if test_execution.started_at else None

            await update_test_execution(
                execution_id,
                TestExecutionUpdateSchema(
                    status=TestStatus.ERROR,
                    notes="Timed out waiting for task manager to complete test execution",
                    ended_at=datetime.now(tzinfo)
                )
            )
        except Exception as e:
            logger.error(f"Failed to update test execution with timeout status: {str(e)}")


async def update_test_execution(
    test_execution_id: UUID4,
    test_execution_update: TestExecutionUpdateSchema
) -> TestExecutionModel:
    """
    Update a test execution.

    Args:
        test_execution_id: UUID of the test execution to update
        test_execution_update: Data to update the test execution with

    Returns:
        The updated test execution

    Raises:
        HTTPException: If the test execution was not found
    """
    # Get the test execution
    test_execution = await get_test_execution(test_execution_id)
    tzinfo = test_execution.started_at.tzinfo if test_execution.started_at else None

    # Update the fields
    update_data = test_execution_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(test_execution, key, value)

    # Calculate duration if ending the test execution
    if test_execution_update.ended_at and not test_execution.duration_ms:
        delta = (test_execution_update.ended_at - test_execution.started_at)
        test_execution.duration_ms = int(delta.total_seconds() * 1000)

    # Save the changes
    await test_execution.save()

    # If status is updated, also update the parent test's status
    if test_execution_update.status:
        test = await TestModel.get(id=test_execution.test_id)
        test.status = test_execution_update.status

        if test_execution_update.status in [TestStatus.PASSED, TestStatus.FAILED, TestStatus.BLOCKED, TestStatus.SKIPPED]:
            test.ended_at = datetime.now(tzinfo)

        await test.save()

    return test_execution


async def finish_test_execution(
    test_execution_id: UUID4,
    status: TestStatus,
    notes: Optional[str] = None,
    evidence: Optional[List[str]] = None
) -> TestExecutionModel:
    """
    Mark a test execution as complete.

    Args:
        test_execution_id: UUID of the test execution to finish
        status: The final status of the test execution
        notes: Optional notes about the test execution
        evidence: Optional list of evidence URLs

    Returns:
        The updated test execution

    Raises:
        HTTPException: If the test execution was not found
    """
    # Get the test execution to get its timezone info
    test_execution = await get_test_execution(test_execution_id)
    tzinfo = test_execution.started_at.tzinfo if test_execution.started_at else None

    update_data = TestExecutionUpdateSchema(
        status=status,
        ended_at=datetime.now(tzinfo),
        notes=notes,
        evidence=evidence
    )

    return await update_test_execution(test_execution_id, update_data)
