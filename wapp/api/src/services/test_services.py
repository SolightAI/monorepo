import os
import requests
import asyncio
import logging
import uuid

from fastapi import HTTPException
from dto.models import Test as TestModel, TestSecret as TestSecretModel, Secret as SecretModel
from dto.schemas import TestCreate as TestCreateSchema, TestStatus, TestUpdate as TestUpdateSchema
from typing import List, Dict, Optional
from uuid import UUID
from services.product_services import get_product_by_url_path
from services.feature_services import get_feature
from services.epic_services import get_epic
from services.product_services import get_product
from services.secret_services import get_secret_with_values
from services.acceptance_criteria_services import get_acceptance_criteria_by_feature
from services.secret_services import get_encrypted_secrets
from pydantic import UUID4
from services.organization_services import get_organization_member, verify_organization_access
from dto.models import OrganizationMember


TASK_MANAGER_URL: str = os.getenv("TASK_MANAGER_URL")  # type: ignore

if not TASK_MANAGER_URL:
    raise ValueError("TASK_MANAGER_URL is not set")


logger = logging.getLogger(__name__)


async def get_test(test_id: UUID) -> TestModel:
    test = await TestModel.get_or_none(id=test_id)

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    return test


async def get_all_tests() -> List[TestModel]:
    tests = await TestModel.all().prefetch_related("bugs", "test_secrets__secret")
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

    # Fetch bugs for each test
    for test in tests:
        await test.fetch_related("bugs")

    return tests


async def get_tests_by_feature(feature_id: UUID) -> List[TestModel]:
    """
    Get all tests for a feature.

    Args:
        feature_id: UUID of the feature

    Returns:
        List of tests for the feature
    """
    return await TestModel.filter(feature_id=feature_id).prefetch_related("bugs")


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


async def update_test_status(test_id: str | UUID, status: TestStatus) -> TestModel:
    test = await TestModel.get_or_none(id=test_id)

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    test.status = status
    await test.save()
    return test


async def delete_test(test_id: str | UUID) -> bool:
    """
    Delete a test and all its related bugs.

    Args:
        test_id: UUID of the test to delete

    Returns:
        True if the test was deleted, False otherwise

    Raises:
        HTTPException: If the test was not found
    """
    test = await TestModel.get_or_none(id=test_id).prefetch_related("bugs")

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # Delete all bugs related to this test
    from services.bug_services import delete_bug
    for bug in test.bugs:
        await delete_bug(bug.id)

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
    feature = await get_feature(feature_id)
    epic = await get_epic(feature.epic_id)
    product = await get_product(epic.product_id)

    # Get acceptance criteria for this feature
    acceptance_criteria_list = await get_acceptance_criteria_by_feature(feature_id)

    # Get user stories for this feature
    await feature.fetch_related("user_stories")
    user_stories = feature.user_stories

    payload = {
        'feature': {
            'id': str(feature.id),
            'name': feature.name,
            'description': feature.description,
            'dependents': [],  # TODO
            'dependencies': [],  # TODO
            'urls': feature.urls,
        },
        'user_stories': [
            {
                'id': str(story.id),
                'name': story.name,
                'description': story.description,
            } for story in user_stories
        ],
        'acceptance_criteria': [
            {
                'id': str(ac.id),
                'name': ac.name,
                'description': ac.description,
            } for ac in acceptance_criteria_list
        ],
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

    # Get organization ID from the product (if available)
    encrypted_secrets = await get_encrypted_secrets(organization_id=product.organization_id, product_id=product.id)

    # Add the encrypted secrets to the payload if any were found
    if encrypted_secrets:
        payload['encrypted_secrets'] = encrypted_secrets
        logger.info("Successfully included encrypted secrets for test generation")

    response = requests.post(
        TASK_MANAGER_URL + "/generate-tests/generate-tests-for-feature",
        json=payload
    )

    if response.status_code != 200:
        logger.error(f"Failed to trigger test generation ({response.status_code}): {response.text}")
        raise HTTPException(status_code=500, detail=f"Failed to trigger test generation ({response.status_code}): {response.text}")

    # Parse the response and add the feature_id
    response_data = response.json()
    if isinstance(response_data, str):
        response_data = {"task_id": response_data}
    response_data["feature_id"] = str(feature_id)
    return response_data


async def get_test_generation_status(test_id: UUID4) -> dict:
    response = requests.get(
        TASK_MANAGER_URL + f"/generate-tests/get-test-generation-status/{test_id}"
    )

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Failed to get test generation status ({response.status_code}): {response.text}")

    response_data = response.json()
    
    # If this is a completed response, ensure it has a feature_id
    if response_data.get("status") == "completed" and "feature_id" not in response_data:
        # Get the feature_id from the original test generation request
        original_response = requests.get(
            TASK_MANAGER_URL + f"/generate-tests/get-test-generation-request/{test_id}"
        )
        if original_response.status_code == 200:
            original_data = original_response.json()
            if "feature_id" in original_data:
                response_data["feature_id"] = original_data["feature_id"]
    
    return response_data


async def poll_test_generation_status(test_id: UUID4, max_attempts: int = 60, interval: int = 1) -> None:
    attempts = 0

    while attempts < max_attempts:
        attempts += 1

        response = await get_test_generation_status(test_id)
        status = response["status"]

        if status == "pending":
            await asyncio.sleep(interval)
            continue

        elif status == "error":
            logger.error(f"Test generation failed for test {test_id}")
            return

        elif status == "completed":
            if not response.get("results"):
                logger.error(f"No test results found in response for test {test_id}")
                return

            # Get the feature_id from the test generation request
            feature_id = response.get("feature_id")
            if not feature_id:
                logger.error(f"No feature_id found in test generation response for test {test_id}")
                return

            created_tests = []
            for test_case in response["results"]:
                try:
                    # Extract test data from the test case
                    test_data = {
                        "feature_id": feature_id,  # Use the feature_id from the response
                        "name": test_case.get("name"),
                        "description": test_case.get("description"),
                        "url": test_case.get("url", ""),
                        "category": test_case.get("category", "SMOKE"),
                        "preconditions": test_case.get("preconditions", ""),
                        "steps": test_case.get("steps", []),
                        "expected_results": test_case.get("expected_results", []),
                        "assertions": test_case.get("assertions", []),
                        "secret_ids": None
                    }

                    # Validate required fields
                    required_fields = ["name", "description", "steps", "expected_results", "assertions"]
                    missing_fields = [field for field in required_fields if not test_data[field]]
                    if missing_fields:
                        logger.error(f"Missing required fields in test data: {missing_fields}")
                        continue

                    # Create the test
                    test = await create_test(
                        TestCreateSchema(**test_data)
                    )
                    created_tests.append(test)
                    logger.info(f"Successfully created test {test.id} for feature {test_data['feature_id']}")
                except Exception as e:
                    logger.error(f"Failed to create test: {str(e)}")
                    continue

            if not created_tests:
                logger.error(f"No tests were successfully created for test {test_id}")
            else:
                logger.info(f"Successfully created {len(created_tests)} tests for test {test_id}")
            return

        else:
            logger.error(f"Unknown test generation status: {status}")
            return

    # If we've exhausted attempts, log a timeout error
    logger.error(f"Timed out waiting for test generation to complete for test {test_id}")
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
                await test.fetch_related("test_secrets__secret", "bugs")
            tests.extend(feature.tests)

    return tests
