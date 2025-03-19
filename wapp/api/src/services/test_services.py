import os
import requests
import asyncio
import logging
import uuid

from fastapi import HTTPException
from dto.models import Test as TestModel, TestSecret as TestSecretModel, Secret as SecretModel
from dto.schemas import TestCreate as TestCreateSchema, TestStatus, TestUpdate as TestUpdateSchema, SecretType
from typing import List, Dict
from uuid import UUID
from services.product_services import get_product_by_url_path
from services.feature_services import get_feature
from services.epic_services import get_epic
from services.product_services import get_product
from services.secret_services import get_secret_with_values, get_organization_secrets
from services.acceptance_criteria_services import get_acceptance_criteria_by_feature
from services.user_story_services import get_user_story
from pydantic import UUID4

from services.crypto_service import crypto_service


logger = logging.getLogger(__name__)


async def get_test(test_id: UUID) -> TestModel:
    test = await TestModel.get_or_none(id=test_id).prefetch_related("bugs", "test_secrets__secret", "executions")

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    return test


async def get_all_tests() -> List[TestModel]:
    tests = await TestModel.all().prefetch_related("bugs", "secret")
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
    return await TestModel.filter(feature_id=feature_id).prefetch_related("bugs", "test_secrets__secret", "executions")


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

    result = {}

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
            if secret_with_values.type == SecretType.USERNAME_PASSWORD:
                result[secret_with_values.type][key] = value
            else:
                # For other types, prefix with secret name to avoid conflicts
                prefixed_key = f"{secret_with_values.name}_{key}"
                result[secret_with_values.type][prefixed_key] = value

    return result


async def trigger_test_generation(feature_id: UUID4) -> str:
    """
    Trigger test generation for a feature.

    Args:
        feature_id: The ID of the feature

    Returns:
        The ID of the generated test
    """
    feature = await get_feature(feature_id)
    epic = await get_epic(feature.epic_id)
    product = await get_product(epic.product_id)

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

    # Add all organization secrets to the payload
    if all_secrets:
        # Encrypt the secrets using the task-manager's public key
        encryption_success, encrypted_secrets = crypto_service.encrypt_secrets(all_secrets)

        if not (encryption_success and encrypted_secrets):
            # Don't proceed with the operation if encryption fails
            error_msg = "Encryption failed, aborting test generation for security reasons"
            logger.error(error_msg)
            # Raise an exception to abort the operation
            raise HTTPException(status_code=500, detail=error_msg)

        # Add the encrypted secrets to the payload
        payload['encrypted_secrets'] = encrypted_secrets
        logger.info("Successfully encrypted secrets for test generation")

    response = requests.post(
        os.getenv("TASK_MANAGER_URL") + "/generate-tests/generate-tests-for-feature",
        json=payload
    )

    if response.status_code != 200:
        logger.error(f"Failed to trigger test generation ({response.status_code}): {response.text}")
        raise HTTPException(status_code=500, detail=f"Failed to trigger test generation ({response.status_code}): {response.text}")

    return response.json()


async def get_test_generation_status(test_id: UUID4) -> dict:
    response = requests.get(
        os.getenv("TASK_MANAGER_URL") + f"/generate-tests/get-test-generation-status/{test_id}"
    )

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Failed to get test generation status ({response.status_code}): {response.text}")

    return response.json()


async def poll_test_generation_status(test_id: UUID4) -> None:
    while True:

        response = await get_test_generation_status(test_id)
        status = response["status"]

        if status == "pending":
            await asyncio.sleep(1)
            continue

        elif status == "error":
            logger.error(f"Test generation failed for test {test_id}")
            return

        elif status == "completed":
            for _test in response["results"]:
                await create_test(
                    TestCreateSchema(
                        feature_id=_test["feature_id"],
                        name=_test["name"],
                        description=_test["description"],
                        url=_test["url"],
                        category=_test["category"],
                        preconditions=_test["preconditions"],
                        steps=_test["steps"],
                        expected_results=_test["expected_results"],
                        assertions=_test["assertions"],
                        secret_ids=None,  # TODO: add secret_ids based on what the agent used
                    )
                )
            return

        else:
            logger.error(f"Unknown test generation status: {status}")
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
