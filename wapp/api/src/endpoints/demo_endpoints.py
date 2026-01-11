from typing import List, Dict
from fastapi import APIRouter, BackgroundTasks, Depends, status
from pydantic import UUID4
from dto.schemas import (
    DemoTestGenerateRequest,
    DemoTestGenerateResponse,
    TestExecutionElement,
    User,
    Test as TestSchema,
    TestExecution as TestExecutionSchema,
    TestExecutionCreate as TestExecutionCreateSchema,
)
from services.test_services import get_test_generation_status, get_tests_by_feature
from services.test_execution_services import create_test_execution, get_test_execution, get_test_executions_by_test
from services.demo_services import generate_demo_tests
from dependencies import get_demo_account_dependency

router = APIRouter(
    prefix="/demo",
    tags=["Demo"],
    responses={404: {"description": "Not found"}},
)


# ------

# POST /demo/tests/generate
@router.post("/tests/generate", response_model=DemoTestGenerateResponse)
async def demo_generate_tests(
    dto: DemoTestGenerateRequest,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    demo_account: User = Depends(get_demo_account_dependency)
) -> DemoTestGenerateResponse:
    """
    Run a test generation task as a demo request.
    Args:
        url: URL of the website for which the test will be generated

    Returns:
        A dictionary feature_id and the task_id of the generation task
    """
    return await generate_demo_tests(dto, demo_account, background_tasks)


# GET /demo/tests/generate/status/${task_id}
@router.get("/tests/generate/status/{task_id}")
async def demo_get_tests_generation_status(task_id: UUID4) -> Dict:
    """
    Get the status of a test generation task.

    Args:
        task_id: The ID of the test generation task

    Returns:
        A dictionary containing the status of the task and any results if completed
    """
    return await get_test_generation_status(task_id)

# GET /demo/tests/${featureId} - Get tests
@router.get("/tests/{feature_id}")
async def demo_get_tests(feature_id: UUID4) -> List[TestSchema]:
    """
    Get all tests for a feature.

    Args:
        feature_id: UUID of the feature

    Returns:
        A list of tests for the feature
    """
    return await get_tests_by_feature(feature_id)

# GET /demo/test-executions/by-test/test_id
@router.get("/test-executions/by-test/{test_id}", response_model=List[TestExecutionElement])
async def demo_get_test_executions_by_test_endpoint(
    test_id: str,
) -> List[TestExecutionElement]:
    """
    Get all executions for a specific test.

    This endpoint returns the complete history of all times the specified test has been run.
    """
    return await get_test_executions_by_test(test_id)

# GET /demo/test-executions/executionId
@router.get("/test-executions/{test_execution_id}", response_model=TestExecutionSchema)
async def demo_get_test_execution_status(test_execution_id: str) -> TestExecutionSchema:
    """
    Get a specific test execution by ID.
    """
    return await get_test_execution(test_execution_id)

# POST /demo/test-executions
@router.post("/test-executions", response_model=TestExecutionSchema, status_code=status.HTTP_201_CREATED)
async def demo_create_test_execution(
    test_execution: TestExecutionCreateSchema,
    background_tasks: BackgroundTasks,
    _: User = Depends(get_demo_account_dependency)
) -> TestExecutionSchema:
    """
    Create a new test execution.

    This endpoint creates a record of a test being run, including information about
    who ran it, in which environment, and other execution details.
    """
    return await create_test_execution(test_execution, background_tasks)
