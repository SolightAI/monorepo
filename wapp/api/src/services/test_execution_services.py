from __future__ import annotations

import uuid
import json
import asyncio
import requests
import os
import logging

from datetime import datetime
from typing import List, Dict
from fastapi import HTTPException, BackgroundTasks
from pydantic import UUID4
from dto.models import TestExecution as TestExecutionModel
from dto.schemas import (
    TestExecutionCreate as TestExecutionCreateSchema,
    TestExecutionUpdate as TestExecutionUpdateSchema,
    TestExecutionElement,
    TestStatus,
    LatestTestExecutionResponse,
)
from services.test_services import get_test
from services.secret_services import get_encrypted_secrets
from utils.s3_utils import generate_presigned_url


TASK_MANAGER_URL: str = os.getenv("TASK_MANAGER_URL")  # type: ignore


if not TASK_MANAGER_URL:
    raise ValueError("TASK_MANAGER_URL is not set")


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
    test_execution = await TestExecutionModel.get_or_none(id=test_execution_id)

    if not test_execution:
        raise HTTPException(status_code=404, detail="Test execution not found")

    # Generate pre-signed URLs for evidence if available
    if test_execution.evidence:
        generated_urls = (
            generate_presigned_url(url) for url in test_execution.evidence if isinstance(url, str)
        )
        test_execution.evidence = [url for url in generated_urls if url is not None]

    return test_execution


async def get_test_executions_by_test(test_id: UUID4) -> List[TestExecutionElement]:
    """
    Get all test executions for a specific test with field selection.

    Args:
        test_id: UUID of the test to get executions for

    Returns:
        List of test executions for the test
    """
    # Verify the test exists
    await get_test(test_id)

    # Build the query
    query = TestExecutionModel.filter(test_id=test_id)

    # Order by started_at descending for consistency
    query = query.order_by("-started_at")

    # Execute the query
    test_executions = await query

    # Generate pre-signed URLs for evidence in each execution
    for execution in test_executions:
        if execution.evidence:
            generated_urls = (
                generate_presigned_url(url) for url in execution.evidence if isinstance(url, str)
            )
            execution.evidence = [url for url in generated_urls if url is not None]

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

    # Trigger test execution on task manager if this is an automated test
    try:
        # Get test data and related information
        await test.fetch_related("feature__epic__product")
        product = test.feature.epic.product

        # Create payload for task manager
        task_manager_payload = {
            "task_id": str(test_execution_model.id),
            "test": {
                "name": test.name,
                "category": test.category,
                "description": test.description,
                "url": test.url,
                "feature_id": "random_id",
                "preconditions": test.preconditions,
                "steps": test.steps,
                "assertions": test.assertions,
                "access_conditions": test.feature.access_conditions,
            },
            "encrypted_secrets": await get_encrypted_secrets(organization_id=product.organization_id, product_id=product.id),
        }

        # Send request to task manager
        response = requests.post(
            TASK_MANAGER_URL + "/run-test/run-test",
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
                    status=TestStatus.PENDING.value,
                    metadata={"task_manager_task_id": task_id},
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


async def poll_task_manager_status(execution_id: UUID4, task_id: str, max_attempts: int = 120, interval: int = 5) -> None:
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
                TASK_MANAGER_URL + f"/run-test/status/{task_id}"
            )

            if response.status_code == 404:
                logger.error(f"Failed to get task status: {task_id}")
                await update_test_execution(
                    execution_id,
                    TestExecutionUpdateSchema(
                        status=TestStatus.FAILED,
                        notes="Failed to get task status.",
                        ended_at=datetime.now(tzinfo),
                        metadata={"error": "Failed to get task status."},
                        tracing={},
                    )
                )
                break

            if response.status_code != 200:
                logger.error(f"Failed to get task status ({response.status_code}): {response.text}")
                attempts += 1
                continue

            status_data = response.json()

            tracing_data = status_data.get("tracing", {})

            # Extract agent thoughts and actions from the response
            agent_thoughts = status_data.get("agent_thoughts", {})
            agent_actions = status_data.get("agent_actions", [])

            # Prepare metadata with agent data
            updated_metadata = (test_execution.metadata or {}) | {
                "agent_thoughts": agent_thoughts,
                "agent_actions": agent_actions
            }

            # Extract evidence list if present
            evidence_list = status_data.get("evidence") or []

            # Update the test execution based on the task status
            if status_data["status"] not in TestStatus:
                logger.error(f"Unknown status of test run: {status_data}")
                await update_test_execution(
                    execution_id,
                    TestExecutionUpdateSchema(
                        status=TestStatus.ERROR,
                        notes=f"Unknown status of test run: {status_data}",
                        ended_at=datetime.now(tzinfo),
                        metadata=updated_metadata,
                        tracing=tracing_data,
                        evidence=evidence_list,
                    )
                )
                break

            elif status_data["status"] == TestStatus.PENDING.value:
                attempts += 1

            else:
                # Task failed
                await update_test_execution(
                    execution_id,
                    TestExecutionUpdateSchema(
                        status=TestStatus(status_data["status"]),
                        notes=str(status_data.get('error')) if status_data.get('error') else str(status_data.get("results", "")),
                        ended_at=datetime.now(tzinfo),
                        metadata=updated_metadata,
                        tracing=tracing_data,
                        evidence=evidence_list,
                    )
                )
                break

        except Exception as e:
            logger.error(f"Error polling task manager status: {str(e)}")
            attempts += 5  # errors count quintuple

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

    # Update the fields
    update_data = test_execution_update.model_dump(exclude_unset=True)

    if "tracing" in update_data:
        for key, value in update_data["tracing"].items():
            update_data["tracing"][key] = json.dumps(value, ensure_ascii=True)

    for key, value in update_data.items():
        setattr(test_execution, key, value)

    # Calculate duration if ending the test execution
    if test_execution_update.ended_at and not test_execution.duration_ms:
        delta = (test_execution_update.ended_at - test_execution.started_at)
        test_execution.duration_ms = int(delta.total_seconds() * 1000)

    # Save the changes
    await test_execution.save()

    return test_execution


async def get_latest_test_executions_by_ids(test_ids: List[UUID4]) -> Dict[UUID4, LatestTestExecutionResponse]:
    """
    Get the single latest test execution for each of the provided test IDs.

    Args:
        test_ids: A list of UUIDs for the tests.

    Returns:
        A dictionary mapping each test ID to its latest execution details.
        If a test has no executions, its details will be None.
    """
    if not test_ids:
        return {}

    # Use Tortoise's raw SQL capabilities for an efficient query
    # This query finds the latest execution for each test ID using row_number()
    query = """
        SELECT
            t.id as test_id,
            te.id as execution_id,
            te.status,
            te.started_at,
            te.ended_at
        FROM (
            SELECT
                id,
                test_id,
                status,
                started_at,
                ended_at,
                ROW_NUMBER() OVER(PARTITION BY test_id ORDER BY started_at DESC) as rn
            FROM test_executions
            WHERE test_id = ANY($1::uuid[])
        ) te
        RIGHT JOIN tests t ON te.test_id = t.id
        WHERE t.id = ANY($1::uuid[]) AND (te.rn = 1 OR te.rn IS NULL)
    """

    conn = TestExecutionModel._meta.db
    results = await conn.execute_query_dict(query, [test_ids])

    # Format the results into the response schema
    latest_executions: Dict[UUID4, LatestTestExecutionResponse] = {}
    for row in results:
        test_id = row['test_id']
        latest_executions[test_id] = LatestTestExecutionResponse(
            test_id=test_id,
            execution_id=row.get('execution_id'),
            status=row.get('status'),
            started_at=row.get('started_at'),
            ended_at=row.get('ended_at')
        )

    # Ensure all requested test_ids are in the result, even if they had no executions
    for tid in test_ids:
        if tid not in latest_executions:
            latest_executions[tid] = LatestTestExecutionResponse(test_id=tid)  # All fields will be None

    return latest_executions
