from fastapi import APIRouter, Depends, status, BackgroundTasks
from typing import List, Dict
from pydantic import UUID4

from dto.schemas import (
    TestExecution as TestExecutionSchema,
    TestExecutionCreate as TestExecutionCreateSchema,
    TestExecutionUpdate as TestExecutionUpdateSchema,
    ExecutorType,
    TestExecutionElement,
    LatestTestExecutionRequest,
    LatestTestExecutionResponse
)
from services.test_execution_services import (
    create_test_execution,
    get_test_execution,
    get_test_executions_by_test,
    update_test_execution,
    get_latest_test_executions_by_ids
)
from dependencies import get_current_user_dependency
from dto.models import User


router = APIRouter(prefix="/test-executions", tags=["test-executions"], dependencies=[Depends(get_current_user_dependency)])


@router.post("/", response_model=TestExecutionSchema, status_code=status.HTTP_201_CREATED)
async def create_test_execution_endpoint(
    test_execution: TestExecutionCreateSchema,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user_dependency)
) -> TestExecutionSchema:
    """
    Create a new test execution.

    This endpoint creates a record of a test being run, including information about
    who ran it, in which environment, and other execution details.
    """
    # If this is a manual test execution, set the executor name to the current user
    if test_execution.executor_type == ExecutorType.MANUAL and not test_execution.executor_name:
        test_execution.executor_name = current_user.username

    return await create_test_execution(test_execution, background_tasks)


@router.get("/{test_execution_id}", response_model=TestExecutionSchema)
async def get_test_execution_endpoint(
    test_execution_id: UUID4,
) -> TestExecutionSchema:
    """
    Get a specific test execution by ID.
    """
    return await get_test_execution(test_execution_id)


@router.get("/by-test/{test_id}", response_model=List[TestExecutionElement])
async def get_test_executions_by_test_endpoint(
    test_id: UUID4,
) -> List[TestExecutionElement]:
    """
    Get all executions for a specific test.

    This endpoint returns the complete history of all times the specified test has been run.
    """
    return await get_test_executions_by_test(test_id)


@router.put("/{test_execution_id}", response_model=TestExecutionSchema)
async def update_test_execution_endpoint(
    test_execution_id: UUID4,
    test_execution_update: TestExecutionUpdateSchema,
) -> TestExecutionSchema:
    """
    Update a test execution with new information.
    """
    return await update_test_execution(test_execution_id, test_execution_update)


@router.post("/latest", response_model=Dict[UUID4, LatestTestExecutionResponse])
async def get_latest_test_executions_endpoint(
    request_body: LatestTestExecutionRequest
) -> Dict[UUID4, LatestTestExecutionResponse]:
    """
    Get the latest execution details for a batch of test IDs.
    """
    return await get_latest_test_executions_by_ids(request_body.test_ids)
