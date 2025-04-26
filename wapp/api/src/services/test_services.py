import asyncio
import logging
import uuid
import traceback

from fastapi import HTTPException
from dto.models import Test as TestModel, TestSecret as TestSecretModel, Secret as SecretModel
from dto.schemas import TestCreate as TestCreateSchema, TestStatus, TestUpdate as TestUpdateSchema
from typing import List, Dict
from uuid import UUID
from services.product_services import get_product_by_url_path
from services.feature_services import get_feature
from services.epic_services import get_epic
from services.product_services import get_product
from services.secret_services import get_secret_with_values
from pydantic import UUID4
from arq.jobs import Job, JobStatus
from services.secret_services import get_encrypted_secrets
from utils.redis_manager import get_redis_pool


logger = logging.getLogger(__name__)


async def get_test(test_id: UUID) -> TestModel:
    test = await TestModel.get_or_none(id=test_id)

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    return test


async def get_all_tests() -> List[TestModel]:
    tests = await TestModel.all().prefetch_related("test_secrets__secret")
    return tests


async def get_tests_by_product_path(url_path: str) -> List[TestModel]:
    """
    Get all tests related to a product that matches the given URL path.

    Args:
        url_path: The URL path segment to match against product URLs

    Returns:
        A list of tests for the matched product, or an empty list if no product matches
    """
    product = await get_product_by_url_path(url_path)
    if not product:
        return []

    tests = []
    # Simplified hierarchy: Product -> Epics -> Features -> Tests
    await product.fetch_related("epics")
    for epic in product.epics:
        await epic.fetch_related("features")
        for feature in epic.features:
            await feature.fetch_related("tests")
            # Fetch test secrets relation for each test
            for test in feature.tests:
                await test.fetch_related("test_secrets__secret")
            tests.extend(feature.tests)

    return tests


async def get_tests_by_feature(feature_id: UUID) -> List[TestModel]:
    """
    Get all tests for a feature.

    Args:
        feature_id: UUID of the feature

    Returns:
        List of tests for the feature
    """
    return await TestModel.filter(feature_id=feature_id)


async def create_test(test: TestCreateSchema) -> TestModel:
    # Extract secret_ids before creating the test
    secret_ids = test.secret_ids
    test_data = test.model_dump(exclude={"secret_ids"})

    # Create the test
    test_model = await TestModel.create(**test_data)

    # Create TestSecret relationships if secret_ids were provided
    if secret_ids:
        for secret_id in secret_ids:
            await TestSecretModel.create(
                id=uuid.uuid4(),
                test_id=test_model.id,
                secret_id=secret_id
            )

    return await get_test(test_model.id)


async def delete_test(test_id: str | UUID) -> bool:
    """
    Delete a test.

    Args:
        test_id: UUID of the test to delete

    Returns:
        True if the test was deleted, False otherwise

    Raises:
        HTTPException: If the test was not found
    """
    test = await TestModel.get_or_none(id=test_id)

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # Delete the test
    await test.delete()

    return True


async def update_test(test_id: UUID4, test_update: TestUpdateSchema) -> TestModel:
    """
    Update a test by ID.

    Args:
        test_id: ID of the test to update
        test_update: Updated test data

    Returns:
        The updated test
    """
    test = await TestModel.get_or_none(id=test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # Extract secret_ids before updating
    secret_ids = test_update.secret_ids

    # Convert the model to a dict and remove None values and secret_ids
    update_data = {k: v for k, v in test_update.model_dump(exclude={"secret_ids"}).items() if v is not None}

    # Update the test
    if update_data:
        await test.update_from_dict(update_data).save()

    # Update test secret relationships if secret_ids was provided
    if secret_ids is not None:
        # Remove existing relationships
        await TestSecretModel.filter(test_id=test_id).delete()

        # Create new relationships
        for secret_id in secret_ids:
            await TestSecretModel.create(
                id=uuid.uuid4(),
                test_id=test_id,
                secret_id=secret_id
            )

    # Return the updated test with all related data
    return await get_test(test_id)


async def get_test_secrets_with_values(test_id: UUID4) -> Dict[str, Dict[str, str]]:
    """
    Get all secrets associated with a test with their decrypted values.

    Args:
        test_id: The ID of the test

    Returns:
        A dictionary with secret types as keys and another dictionary of keys/values as values
    """
    test = await TestModel.get_or_none(id=test_id).prefetch_related("test_secrets__secret")
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    result: Dict[str, Dict[str, str]] = {}

    # Process each test secret
    for test_secret in test.test_secrets:
        # Get the secret with its values
        secret_with_values = await get_secret_with_values(test_secret.secret_id)

        # If this is the first secret of this type, create a new entry
        if secret_with_values.type not in result:
            result[secret_with_values.type] = {}

        # Add values to the result
        for key, value in secret_with_values.values.items():
            # For username_password type, store directly
            result[secret_with_values.type][key] = value

    return result


async def trigger_test_generation(feature_id: UUID4) -> dict:
    """
    Trigger test generation for a feature.

    Args:
        feature_id: The ID of the feature

    Returns:
        A dictionary containing the task ID and feature ID
    """

    redis = await get_redis_pool()

    feature = await get_feature(feature_id)
    epic = await get_epic(feature.epic_id)
    product = await get_product(epic.product_id)

    # Get user stories for this feature
    await feature.fetch_related("user_stories")

    payload = {
        'feature': {
            'id': str(feature.id),
            'name': feature.name,
            'description': feature.description,
            'urls': feature.urls,
            'access_conditions': feature.access_conditions,
        },
        'epic': {
            'name': epic.name,
            'description': epic.description,
        },
        'product': {
            'name': product.name,
            'url': product.url,
            'description': product.description,
            'documentation': product.documentation,
            'links_to_documentation': [],  # TODO
        },
    }

    encrypted_secrets = await get_encrypted_secrets(
        organization_id=product.organization_id,
        product_id=product.id
    )

    if encrypted_secrets:
        payload['secrets'] = {k.value: v for k, v in encrypted_secrets.items()}

    job = await redis.enqueue_job('generate_tests', **payload, _job_id=str(feature_id))
    # Job already exists, retrieve it
    if job is None:
        job = Job(str(feature_id), redis=redis)

    return {"task_id": job.job_id}


async def get_test_generation_status(test_id: UUID4) -> dict:
    """
    Get the status of a test generation task using arq.

    Args:
        test_id: The job ID of the test generation task

    Returns:
        A dictionary containing the task status and potentially results/feature_id
    """
    redis = await get_redis_pool()
    try:
        job = Job(str(test_id), redis=redis)
        job_status = await job.status()
        job_info = await job.info()
        response_data = {"task_id": str(test_id)}

        if job_status == JobStatus.complete:

            try:
                job_result = await job.result()  # job.result() raise any exception the worker raises
            except Exception:
                return response_data | {"status": TestStatus.ERROR.value, "error": "An error occurred while generating tests"}

            response_data |= job_result

            # Attempt to get feature_id from the job's initial arguments
            if job_info and 'feature' in job_info.kwargs and 'id' in job_info.kwargs['feature']:
                response_data["feature_id"] = job_info.kwargs['feature']['id']
            else:
                logger.warning(f"Could not retrieve feature_id for completed job {test_id}")

        elif job_status in [JobStatus.queued, JobStatus.deferred, JobStatus.in_progress]:
            response_data["status"] = TestStatus.PENDING.value
        elif job_status == JobStatus.not_found:
            response_data["status"] = TestStatus.UNKNOWN.value
        else:  # JobStatus.not_found or other unexpected statuses
            logger.error(f"Unexpected job status: {job_status}")
            response_data["status"] = TestStatus.UNKNOWN.value

        return response_data

    except ConnectionRefusedError:
        logger.error("Could not connect to Redis.")
        raise HTTPException(status_code=503, detail="Service unavailable: Could not connect to task queue.")
    except Exception as e:
        logger.error(f"Error getting test generation status for job {test_id}: {e}")
        logger.error(traceback.format_exc())
        return {"task_id": str(test_id), "status": TestStatus.ERROR.value}


async def poll_test_generation_status(task_id: UUID4, timeout: int = 300, interval: float = 0.5) -> None:
    attempts = 0

    max_attempts = timeout / interval

    while attempts < max_attempts:
        attempts += 1

        response = await get_test_generation_status(task_id)
        status = response["status"]

        if status in [TestStatus.PENDING.value, TestStatus.UNKNOWN.value]:
            await asyncio.sleep(interval)
            continue

        elif status == TestStatus.ERROR.value:
            logger.error(f"Test generation failed for task {task_id}")
            return

        elif status == TestStatus.PASSED.value:

            if not response.get("results"):
                logger.error(f"No test results found in response for task {task_id}")
                return

            created_tests = []
            logger.info(f"Creating tests for task {task_id}")
            for _test in response["results"]:
                try:
                    test = await create_test(
                        TestCreateSchema(
                            feature_id=_test["feature_id"],
                            name=_test["name"],
                            description=_test["description"],
                            url=_test["url"],
                            category=_test["category"],
                            preconditions=_test["preconditions"],
                            steps=_test["steps"],
                            assertions=_test["assertions"],
                            secret_ids=None,  # TODO: add secret_ids based on what the agent used
                        )
                    )
                    created_tests.append(test)
                    logger.info(f"Successfully created test {test.id} for feature {_test['feature_id']}")
                except Exception as e:
                    logger.error(f"Failed to create test: {str(e)} {_test=}")
                    logger.error(traceback.format_exc())
                    continue

            if not created_tests:
                logger.error(f"No tests were successfully created for task {task_id}")
            else:
                logger.info(f"Successfully created {len(created_tests)} tests for task {task_id}")
            return

        else:
            logger.error(f"Unknown test generation status: {status}")
            return

    # If we've exhausted attempts, log a timeout error
    logger.error(f"Timed out waiting ({timeout} seconds) for test generation to complete for task {task_id}")

    return


async def get_test_secrets(test_id: UUID4) -> List[TestSecretModel]:
    """
    Get all secrets associated with a test.

    Args:
        test_id: ID of the test

    Returns:
        List of test-secret relationships
    """
    # Verify the test exists
    test = await TestModel.get_or_none(id=test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # Fetch and return the test secrets
    await test.fetch_related("test_secrets__secret")
    return test.test_secrets


async def add_test_secret(test_id: UUID4, secret_id: UUID4) -> TestSecretModel:
    """
    Add a secret to a test.

    Args:
        test_id: ID of the test
        secret_id: ID of the secret

    Returns:
        The created test-secret relationship
    """
    # Verify the test exists
    test = await TestModel.get_or_none(id=test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # Verify the secret exists
    secret = await SecretModel.get_or_none(id=secret_id)
    if not secret:
        raise HTTPException(status_code=404, detail="Secret not found")

    # Check if the relationship already exists
    existing = await TestSecretModel.get_or_none(test_id=test_id, secret_id=secret_id)
    if existing:
        return existing

    # Create the relationship
    test_secret = await TestSecretModel.create(
        id=uuid.uuid4(),
        test_id=test_id,
        secret_id=secret_id
    )

    # Fetch the related secret for the response
    await test_secret.fetch_related("secret")

    return test_secret


async def delete_test_secret(test_id: UUID4, secret_id: UUID4) -> None:
    """
    Remove a secret from a test.

    Args:
        test_id: ID of the test
        secret_id: ID of the secret
    """
    # Verify the test exists
    test = await TestModel.get_or_none(id=test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # Delete the relationship
    deleted_count = await TestSecretModel.filter(test_id=test_id, secret_id=secret_id).delete()

    # Check if the relationship existed
    if deleted_count == 0:
        raise HTTPException(status_code=404, detail="Secret not associated with this test")


async def get_tests_by_product_id(product_id: UUID4) -> List[TestModel]:
    """
    Get all tests related to a product by its ID.

    Args:
        product_id: The UUID of the product

    Returns:
        A list of tests for the product, or an empty list if no product found
    """
    product = await get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    tests = []
    # Traverse hierarchy: Product -> Epics -> Features -> Tests
    await product.fetch_related("epics")
    for epic in product.epics:
        await epic.fetch_related("features")
        for feature in epic.features:
            await feature.fetch_related("tests")
            # Fetch test secrets relation for each test
            for test in feature.tests:
                await test.fetch_related("test_secrets__secret")
            tests.extend(feature.tests)

    return tests
