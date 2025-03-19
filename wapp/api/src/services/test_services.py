import os
import requests
import asyncio
import logging
import uuid
import httpx

from fastapi import HTTPException
from dto.models import Test as TestModel, TestSecret as TestSecretModel, Secret as SecretModel
from dto.schemas import TestCreate as TestCreateSchema, TestStatus, TestUpdate as TestUpdateSchema, SecretType
from typing import List, Dict
from uuid import UUID
from services.product_services import get_product_by_url_path
from services.acceptance_criteria_services import get_acceptance_criteria
from services.user_story_services import get_user_story
from services.feature_services import get_feature
from services.epic_services import get_epic
from services.product_services import get_product
from services.secret_services import get_secret_with_values, get_organization_secrets
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
    # Traverse the hierarchy: Product -> Epics -> Features -> Tests
    await product.fetch_related("epics")
    for epic in product.epics:
        await epic.fetch_related("features")
        for feature in epic.features:
            # Fetch tests directly linked to the feature
            await feature.fetch_related("tests")
            # Fetch test secrets relation for each test
            for test in feature.tests:
                await test.fetch_related("test_secrets__secret")
            tests.extend(feature.tests)

    # Fetch bugs for each test
    for test in tests:
        await test.fetch_related("bugs")

    return tests


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


async def trigger_test_generation(acceptance_criteria_id: UUID4) -> str:
    """
    Trigger a test generation task for a given acceptance criteria.
    
    Args:
        acceptance_criteria_id: ID of the acceptance criteria to generate tests for
        
    Returns:
        Task ID string to use for checking status
    """
    from services.acceptance_criteria_services import get_acceptance_criteria
    from services.feature_services import get_feature
    from services.epic_services import get_epic
    from services.product_services import get_product
    
    # Get acceptance criteria
    acceptance_criteria = await get_acceptance_criteria(acceptance_criteria_id)
    
    # Get feature from acceptance criteria
    feature = await get_feature(acceptance_criteria.feature_id)
    
    # Get epic from feature
    epic = await get_epic(feature.epic_id)
    
    # Get product from epic
    product = await get_product(epic.product_id)
    
    # Get any secrets for this product's organization that might be needed for test generation
    logger.info(f"Getting secrets for product {product.id}")
    secrets = await get_formatted_secrets_by_product(product.id)
    
    # Only pass values that can be serialized to JSON
    acceptance_criteria_data = {
        "id": str(acceptance_criteria.id),
        "name": acceptance_criteria.name,
        "description": acceptance_criteria.description
    }
    
    # Include user stories data
    user_stories_data = []
    if hasattr(feature, 'user_stories') and feature.user_stories:
        for story in feature.user_stories:
            user_stories_data.append({
                "id": str(story.id),
                "name": story.name,
                "description": story.description
            })
    
    feature_data = {
        "id": str(feature.id),
        "name": feature.name,
        "description": feature.description,
        "urls": feature.urls,
        "user_stories": user_stories_data
    }
    
    epic_data = {
        "name": epic.name,
        "description": epic.description
    }
    
    product_data = {
        "name": product.name,
        "description": product.description,
        "url": product.url,
        "documentation": product.documentation,
        "links_to_documentation": [link.model_dump() for link in product.links_to_documentation] if hasattr(product, "links_to_documentation") else []
    }
    
    # Call the task manager to generate tests
    url = f"{os.environ.get('TASK_MANAGER_URL', 'http://localhost:8001')}/generate-tests-for-acceptance-criteria"
    
    response = None
    try:
        response = await httpx.post(
            url,
            json={
                "product": product_data,
                "epic": epic_data,
                "feature": feature_data,
                "acceptance_criteria": acceptance_criteria_data,
                "secrets": secrets
            },
            timeout=30.0,
        )
        response.raise_for_status()
        task_id = response.json().get("task_id")
        return task_id
    except httpx.HTTPError as e:
        logger.error(f"Error triggering test generation: {e}")
        if response:
            logger.error(f"Response status: {response.status_code}, Response body: {response.text}")
        raise HTTPException(status_code=500, detail="Failed to trigger test generation")
    except Exception as e:
        logger.error(f"Unexpected error triggering test generation: {e}")
        raise HTTPException(status_code=500, detail="Failed to trigger test generation")


async def get_test_generation_status(task_id: UUID4) -> dict:
    """
    Check the status of a test generation task.
    
    Args:
        task_id: The ID of the test generation task
        
    Returns:
        Dictionary with status information
    """
    try:
        # Call the task manager API to get status
        url = f"{os.environ.get('TASK_MANAGER_URL', 'http://localhost:8001')}/get-test-generation-status/{task_id}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        logger.error(f"Error checking test generation status: {e}")
        raise HTTPException(status_code=500, detail="Failed to check test generation status")
    except Exception as e:
        logger.error(f"Unexpected error checking test generation status: {e}")
        raise HTTPException(status_code=500, detail="Failed to check test generation status")


async def poll_test_generation_status(task_id: UUID4) -> None:
    """
    Poll for test generation status and create tests when complete.
    This function runs in the background and will poll until the test
    generation is complete or fails.
    
    Args:
        task_id: The ID of the test generation task
    """
    MAX_RETRIES = 60  # 5 minutes at 5-second intervals
    retry_count = 0
    
    while retry_count < MAX_RETRIES:
        try:
            # Sleep to avoid hammering the API
            await asyncio.sleep(5)
            
            # Get the current status
            status_response = await get_test_generation_status(task_id)
            
            # Check if we have a status
            if not status_response:
                logger.warning(f"Empty response for test generation task {task_id}")
                retry_count += 1
                continue
                
            status = status_response.get("status")
            
            # If still pending, continue polling
            if status == "pending":
                logger.info(f"Test generation task {task_id} still pending...")
                retry_count += 1
                continue
                
            # If completed, create the tests
            if status == "completed":
                logger.info(f"Test generation task {task_id} completed")
                test_results = status_response.get("results", [])
                
                # Create tests from the results
                if test_results:
                    for test_data in test_results:
                        try:
                            # Create the test schema
                            test_schema = TestCreateSchema(
                                name=test_data.get("name", "Generated Test"),
                                description=test_data.get("description", ""),
                                url=test_data.get("url", ""),
                                category=test_data.get("category", TestCategory.SMOKE),
                                feature_id=UUID(test_data.get("feature_id")),
                                preconditions=test_data.get("preconditions", ""),
                                steps=test_data.get("steps", ""),
                                expected_results=test_data.get("expected_results", ""),
                                assertions=test_data.get("assertions", "")
                            )
                            
                            # Create the test
                            await create_test(test_schema)
                        except Exception as e:
                            logger.error(f"Failed to create test from generation result: {e}")
                
                # We're done
                return
                
            # If failed, log the error
            if status == "failed":
                error = status_response.get("error", "Unknown error")
                logger.error(f"Test generation task {task_id} failed: {error}")
                return
                
            # Unknown status
            logger.warning(f"Unknown status for test generation task {task_id}: {status}")
            retry_count += 1
            
        except Exception as e:
            logger.error(f"Error polling test generation status: {e}")
            retry_count += 1
    
    logger.error(f"Test generation task {task_id} timed out after {MAX_RETRIES} retries")


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


async def get_formatted_secrets_by_product(product_id: UUID4) -> dict:
    """
    Get all secrets associated with a product's organization, formatted for test generation.
    
    Args:
        product_id: ID of the product to get secrets for
        
    Returns:
        Dictionary of secrets by type, ready for test generation
    """
    # Build dictionary of all secrets with their decrypted values
    all_secrets = {}
    
    try:
        # Get the product to find its organization
        product = await get_product(product_id)
        
        # Skip if product has no organization
        if not product.organization_id:
            logger.error(f"Product {product_id} has no organization, cannot retrieve secrets")
            return all_secrets
            
        # Get all secrets for this organization
        org_secrets = await get_organization_secrets(product.organization_id)
        
        # Process each secret
        for secret in org_secrets:
            try:
                # Get the secret with its values
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
    except Exception as e:
        # Log the error but return empty secrets dictionary
        logger.error(f"Error getting secrets for product {product_id}: {str(e)}")
    
    return all_secrets
