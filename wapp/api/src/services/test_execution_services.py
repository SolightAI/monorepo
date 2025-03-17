from __future__ import annotations
import uuid
import asyncio
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException
from pydantic import UUID4

from dto.models import TestExecution as TestExecutionModel, Test as TestModel
from dto.schemas import (
    TestExecutionCreate as TestExecutionCreateSchema,
    TestExecutionUpdate as TestExecutionUpdateSchema,
    TestExecution as TestExecutionSchema,
    TestStatus
)
from services.test_services import get_test


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
    test_execution: TestExecutionCreateSchema
) -> TestExecutionModel:
    """
    Create a new test execution.

    Args:
        test_execution: Data for the test execution to create

    Returns:
        The created test execution

    Raises:
        HTTPException: If the test was not found
    """
    # Verify the test exists
    await get_test(test_execution.test_id)

    # Create the test execution
    test_execution_dict = test_execution.model_dump()
    test_execution_dict["id"] = uuid.uuid4()
    test_execution_model = await TestExecutionModel.create(**test_execution_dict)

    # Update the test's status
    test = await TestModel.get(id=test_execution.test_id)
    test.status = test_execution.status
    test.started_at = datetime.now() if not test.started_at else test.started_at
    
    if test_execution.status in [TestStatus.PASSED, TestStatus.FAILED, TestStatus.BLOCKED, TestStatus.SKIPPED]:
        test.ended_at = datetime.now()
    
    await test.save()

    return await get_test_execution(test_execution_model.id)


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
            test.ended_at = datetime.now()
            
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
    now = datetime.now()
    update_data = TestExecutionUpdateSchema(
        status=status,
        ended_at=now,
        notes=notes,
        evidence=evidence
    )
    
    return await update_test_execution(test_execution_id, update_data) 