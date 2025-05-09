from __future__ import annotations

import uuid
import json
import asyncio
import logging

from datetime import datetime
from typing import List, Dict, Any, Optional
from arq.jobs import Job, JobStatus
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
from utils.s3_utils import generate_presigned_url
from services.secret_services import get_encrypted_secrets
from utils.redis_manager import get_redis_pool


MAX_WAITING_TIME_FOR_TEST_EXECUTION_IN_SECONDS = 60 * 60  # 1 hour


logger = logging.getLogger(__name__)


async def get_test_execution(test_execution_id: UUID4 | str) -> TestExecutionModel:
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

    # if started more than MAX_WAITING_TIME_FOR_TEST_EXECUTION_IN_SECONDS minutes ago, set status to timed out
    tzinfo = test_execution.started_at.tzinfo if test_execution.started_at else None
    if test_execution.status == TestStatus.PENDING.value and test_execution.started_at and (datetime.now(tzinfo) - test_execution.started_at).total_seconds() > MAX_WAITING_TIME_FOR_TEST_EXECUTION_IN_SECONDS:
        await update_test_execution(
            test_execution,
            TestExecutionUpdateSchema(
                status=TestStatus.ERROR,
                ended_at=datetime.now(tzinfo),
                notes="Default timeout reached waiting for task manager to complete test execution",
            )
        )
        return await get_test_execution(test_execution_id)

    # Check if the test execution is complete
    if test_execution.status == TestStatus.PENDING.value:
        update_data = await _check_status_from_redis(test_execution)
        if update_data:
            await update_test_execution(test_execution, update_data)
            return await get_test_execution(test_execution_id)

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

    return [TestExecutionElement.model_validate(ex, from_attributes=True) for ex in test_executions]


async def create_test_execution(
    test_execution: TestExecutionCreateSchema,
    background_tasks: Optional[BackgroundTasks] = None
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

    redis = await get_redis_pool()

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
        feature = test.feature

        # Create payload for task manager job
        payload: dict[str, Any] = {
            "product": {
                "url": product.url,
                "name": product.name,
                "description": product.description,
                "documentation": product.documentation,
                "links_to_documentation": product.links_to_documentation,
            },
            "feature": {
                "id": feature.id,
                "name": feature.name,
                "description": feature.description,
                "urls": feature.urls,
            },
            "test": {
                "name": test.name,
                "category": test.category.value,
                "description": test.description,
                "url": feature.urls[0],
                "feature_id": "random_id",
                "preconditions": test.preconditions,
                "steps": test.steps,
                "assertions": test.assertions,
                "access_conditions": test.feature.access_conditions,
            },
            "run_without_cache": test_execution.run_without_cache,
        }

        encrypted_secrets = await get_encrypted_secrets(
            organization_id=product.organization_id,
            product_id=product.id
        )

        if encrypted_secrets:
            payload['secrets'] = encrypted_secrets

        job = await redis.enqueue_job('run_test', **payload, _job_id=str(test_execution_model.id))

        if job is None:
            raise HTTPException(status_code=500, detail="Failed to trigger test execution")

        if background_tasks:
            background_tasks.add_task(
                poll_task_manager_status,
                execution_id=test_execution_model.id,
            )

    except Exception as e:
        logger.error(f"Error triggering test execution: {str(e)}")
        # Update the execution with an error status
        await update_test_execution(
            test_execution_model,
            TestExecutionUpdateSchema(
                status=TestStatus.ERROR,
                notes=f"Error triggering test execution: {str(e)}",
                ended_at=datetime.now(test_execution_model.started_at.tzinfo if test_execution_model.started_at else None)
            )
        )

    return await get_test_execution(test_execution_model.id)


async def _check_status_from_redis(test_execution: TestExecutionModel) -> TestExecutionUpdateSchema | None:
    """
    Check the status of the test execution from Redis.

    Args:
        test_execution: The test execution to check the status of

    Returns:
        True if the test execution is complete, False otherwise
    """

    redis = await get_redis_pool()

    job = Job(str(test_execution.id), redis=redis)
    job_status = await job.status()

    logger.info(f"Job {test_execution.id} status: {job_status}")

    if job_status in [JobStatus.queued, JobStatus.deferred, JobStatus.in_progress]:
        return None

    tzinfo = test_execution.started_at.tzinfo if test_execution.started_at else None

    if job_status == JobStatus.not_found:
        return TestExecutionUpdateSchema(
            status=TestStatus.ERROR,
            notes="Test execution not found",
            ended_at=datetime.now(tzinfo),
        )

    try:
        status_data = await job.result()
    except Exception as e:
        logger.error(f"Job {test_execution.id} failed: {str(e)}")
        return TestExecutionUpdateSchema(
            status=TestStatus.ERROR,
            notes=f"{str(e)}",
            ended_at=datetime.now(tzinfo),
        )

    tracing_data: Dict[str, Any] = {}  # FIXME: add back tracing once SOL-213 solved
    # tracing_data = status_data.get("tracing", {})

    # Extract agent thoughts and actions from the response
    agent_thoughts = status_data.get("agent_thoughts", {})
    agent_actions = status_data.get("agent_actions", [])

    # Prepare metadata with agent data
    logger.info(f"status_data: {status_data}")
    logger.info(f"status_data.is_from_cache: {status_data.get('is_from_cache', 'NOTHING')}")
    updated_metadata = (test_execution.metadata or {}) | {
        "agent_thoughts": agent_thoughts,
        "agent_actions": agent_actions,
        "is_from_cache": status_data.get("is_from_cache", False),
    }

    # Extract evidence list if present
    evidence_list = status_data.get("evidence") or []

    # Update the test execution based on the task status
    if status_data["status"] not in [status.value for status in TestStatus]:
        logger.error(f"Unknown status of test run: {status_data}")
        return TestExecutionUpdateSchema(
            status=TestStatus.ERROR,
            notes=f"Unknown status of test run: {status_data}",
            ended_at=datetime.now(tzinfo),
            metadata=updated_metadata,
            tracing=tracing_data,
            evidence=evidence_list,
        )

    elif status_data["status"] == TestStatus.PENDING.value:
        return None

    else:
        # Task failed
        return TestExecutionUpdateSchema(
            status=TestStatus(status_data["status"]),
            notes=str(status_data.get('error')) if status_data.get('error') else str(status_data.get("results", "")),
            ended_at=datetime.now(tzinfo),
            metadata=updated_metadata,
            tracing=tracing_data,
            evidence=evidence_list,
        )


async def poll_task_manager_status(execution_id: UUID4, max_waiting_time: int = 15 * 60, interval: int = 5) -> None:
    """
    Poll the task manager for status updates and update the test execution accordingly.
    This is a non-async function for use with FastAPI BackgroundTasks.

    Args:
        execution_id: ID of the test execution to update
        max_waiting_time: Maximum waiting time in seconds before giving up
        interval: Interval between polls in seconds
    """

    attempts = 0
    max_attempts = max_waiting_time // interval

    test_execution = await get_test_execution(execution_id)
    tzinfo = test_execution.started_at.tzinfo if test_execution.started_at else None

    while attempts < max_attempts:

        try:

            await asyncio.sleep(interval)

            update_data = await _check_status_from_redis(test_execution)
            if update_data:
                await update_test_execution(test_execution, update_data)
                return

            attempts += 1

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
                test_execution,
                TestExecutionUpdateSchema(
                    status=TestStatus.ERROR,
                    notes="Timed out waiting for task manager to complete test execution",
                    ended_at=datetime.now(tzinfo)
                )
            )
        except Exception as e:
            logger.error(f"Failed to update test execution with timeout status: {str(e)}")


async def update_test_execution(
    test_execution: TestExecutionModel,
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
