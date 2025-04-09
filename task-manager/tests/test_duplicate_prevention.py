import pytest
import os
from unittest.mock import patch, AsyncMock, MagicMock
import requests
import sys
from uuid import uuid4

# Import modules from src directory
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.generate_tests.generate_tests_for_feature import (
    _get_existing_tests_for_same_epic,
    _format_existing_tests_for_prompt,
    _check_for_duplicate_test
)
from src.utils.dto import Product, Epic, Feature, TestCategory


def test_format_existing_tests_for_prompt():
    """Test formatting existing tests for inclusion in the prompt."""
    # Create test data
    current_feature_id = "12345"

    # Test with empty list
    assert _format_existing_tests_for_prompt([], current_feature_id) == ""

    # Test with only tests from the current feature
    tests = [
        {"feature_id": current_feature_id, "name": "Test 1", "description": "Description 1", "steps": "Steps 1"}
    ]
    assert _format_existing_tests_for_prompt(tests, current_feature_id) == ""

    # Test with tests from other features
    tests = [
        {"feature_id": current_feature_id, "name": "Test from current feature", "description": "Desc", "steps": "Steps"},
        {"feature_id": "other-id", "name": "Test from other feature", "description": "Other desc", "steps": "Other steps"}
    ]
    result = _format_existing_tests_for_prompt(tests, current_feature_id)
    assert "== Existing Tests in Related Features ==" in result
    assert "Test 1: Test from other feature" in result
    assert "Description: Other desc" in result
    assert "Steps:\nOther steps" in result
    assert "Please avoid creating duplicate tests" in result

    # Test with multiple tests from other features
    tests = [
        {"feature_id": "other-id-1", "name": "Test 1", "description": "Desc 1", "steps": "Steps 1"},
        {"feature_id": "other-id-2", "name": "Test 2", "description": "Desc 2", "steps": "Steps 2"}
    ]
    result = _format_existing_tests_for_prompt(tests, current_feature_id)
    assert "Test 1: Test 1" in result
    assert "Test 2: Test 2" in result


@pytest.mark.asyncio
async def test_get_existing_tests_for_same_epic():
    """Test retrieving existing tests for the same epic."""
    # Create a mock epic ID
    epic_id = str(uuid4())

    # Create mock API response data
    mock_tests = [
        {
            "id": str(uuid4()),
            "name": "Test 1",
            "feature_id": str(uuid4()),
            "description": "Description 1",
            "steps": "Steps 1"
        },
        {
            "id": str(uuid4()),
            "name": "Test 2",
            "feature_id": str(uuid4()),
            "description": "Description 2",
            "steps": "Steps 2"
        }
    ]

    # Mock a successful API response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_tests

    # Patch the requests.get function
    with patch('requests.get', return_value=mock_response):
        # Call the function
        result = await _get_existing_tests_for_same_epic(epic_id)

        # Verify the function called the correct API endpoint
        requests.get.assert_called_once_with(f"{os.getenv('API_URL', 'http://localhost:8000')}/tests/by-epic/{epic_id}")

        # Verify the result
        assert result == mock_tests


@pytest.mark.asyncio
async def test_get_existing_tests_for_same_epic_api_error():
    """Test handling of API errors when retrieving existing tests."""
    # Create a mock epic ID
    epic_id = str(uuid4())

    # Mock an API error response
    mock_response = MagicMock()
    mock_response.status_code = 500

    # Patch the requests.get function
    with patch('requests.get', return_value=mock_response):
        # Patch the logger to capture log messages
        with patch('src.generate_tests.generate_tests_for_feature.logger') as mock_logger:
            # Call the function
            result = await _get_existing_tests_for_same_epic(epic_id)

            # Verify the function called the correct API endpoint
            requests.get.assert_called_once()

            # Verify error was logged
            mock_logger.error.assert_called_once()

            # Verify the result is an empty list
            assert result == []


@pytest.mark.asyncio
async def test_check_for_duplicate_test():
    """Test checking for duplicate tests via the API."""
    # Create mock test case, product ID, and feature ID
    test_case = {
        "name": "Login Test",
        "steps": "1. Navigate to login\n2. Enter credentials\n3. Click login"
    }
    product_id = str(uuid4())
    feature_id = str(uuid4())

    # Mock a successful API response indicating a duplicate
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "is_duplicate": True,
        "duplicate_id": str(uuid4()),
        "similarity_score": 0.85
    }

    # Patch the requests.post function
    with patch('requests.post', return_value=mock_response):
        # Call the function
        result = await _check_for_duplicate_test(test_case, product_id, feature_id)

        # Verify the function called the correct API endpoint with the right data
        requests.post.assert_called_once()
        call_args = requests.post.call_args[1]["json"]
        assert call_args["test_name"] == test_case["name"]
        assert call_args["test_steps"] == test_case["steps"]
        assert call_args["product_id"] == product_id
        assert call_args["feature_id"] == feature_id

        # Verify the result indicates a duplicate was found
        assert result is True


@pytest.mark.asyncio
async def test_check_for_duplicate_test_no_duplicate():
    """Test checking for duplicate tests when none exists."""
    # Create mock test case and IDs
    test_case = {
        "name": "New Test",
        "steps": "1. Step one\n2. Step two"
    }
    product_id = str(uuid4())
    feature_id = str(uuid4())

    # Mock an API response indicating no duplicate
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "is_duplicate": False,
        "duplicate_id": None,
        "similarity_score": None
    }

    # Patch the requests.post function
    with patch('requests.post', return_value=mock_response):
        # Call the function
        result = await _check_for_duplicate_test(test_case, product_id, feature_id)

        # Verify the function called the API
        requests.post.assert_called_once()

        # Verify the result indicates no duplicate was found
        assert result is False


@pytest.mark.asyncio
async def test_check_for_duplicate_test_api_error():
    """Test handling of API errors when checking for duplicates."""
    # Create mock test case and IDs
    test_case = {
        "name": "Test Case",
        "steps": "1. Step one\n2. Step two"
    }
    product_id = str(uuid4())
    feature_id = str(uuid4())

    # Mock an API error response
    mock_response = MagicMock()
    mock_response.status_code = 500

    # Patch the requests.post function
    with patch('requests.post', return_value=mock_response):
        # Patch the logger to capture log messages
        with patch('src.generate_tests.generate_tests_for_feature.logger') as mock_logger:
            # Call the function
            result = await _check_for_duplicate_test(test_case, product_id, feature_id)

            # Verify error was logged
            mock_logger.error.assert_called_once()

            # Verify the result is False (conservatively assume no duplicate)
            assert result is False


@pytest.mark.asyncio
async def test_generate_test_category_for_feature_with_duplicates():
    """Test the test generation function with duplicate detection."""
    # Create mock feature, product, epic, etc.
    feature = Feature(
        id="feature-1",
        name="Feature 1",
        description="Description",
        urls=["http://example.com"],
        dependencies=[],
        dependents=[]
    )
    epic = Epic(name="Epic 1", description="Epic Description")
    product = Product(
        name="Product",
        url="http://example.com",
        description="Product Description",
        documentation="",
        links_to_documentation=[]
    )

    # Create mock parsed test cases where one is a duplicate and one is not
    mock_test_cases = [
        {
            "name": "Duplicate Test",
            "description": "This is a duplicate",
            "preconditions": "None",
            "steps": "1. Step one\n2. Step two",
            "expected_results": "Expected results",
            "assertions": "Assertions"
        },
        {
            "name": "Unique Test",
            "description": "This is not a duplicate",
            "preconditions": "None",
            "steps": "1. Other step\n2. Another step",
            "expected_results": "Expected results",
            "assertions": "Assertions"
        }
    ]

    # Set up patches to mock the complex function behavior
    with patch('src.generate_tests.generate_tests_for_feature._get_existing_tests_for_same_epic', return_value=[]):
        with patch('src.generate_tests.generate_tests_for_feature._format_existing_tests_for_prompt', return_value="Existing tests section"):
            with patch('src.generate_tests.generate_tests_for_feature.Browser') as mock_browser:
                with patch('src.generate_tests.generate_tests_for_feature.BrowserContext') as mock_context:
                    with patch('src.generate_tests.generate_tests_for_feature.Agent') as mock_agent:
                        with patch('src.generate_tests.generate_tests_for_feature.validate_agent_history', return_value="Test case text"):
                            with patch('src.generate_tests.generate_tests_for_feature._parse_test_cases', return_value=mock_test_cases):
                                # Mock the duplicate check to return True for the first test and False for the second
                                with patch('src.generate_tests.generate_tests_for_feature._check_for_duplicate_test', side_effect=[True, False]):
                                    with patch('src.generate_tests.generate_tests_for_feature.logger') as mock_logger:
                                        # Set up context for browser automation
                                        mock_context_instance = AsyncMock()
                                        mock_context.return_value = mock_context_instance
                                        mock_browser_instance = AsyncMock()
                                        mock_browser.return_value = mock_browser_instance

                                        # Set up mock agent
                                        mock_agent_instance = AsyncMock()
                                        mock_agent.return_value = mock_agent_instance

                                        # Call the function
                                        from src.generate_tests.generate_tests_for_feature import _generate_test_category_for_feature
                                        result = await _generate_test_category_for_feature(
                                            task_id="task-id",
                                            product=product,
                                            epic=epic,
                                            feature=feature,
                                            user_stories=[],
                                            acceptance_criteria_list=[],
                                            category_of_test=TestCategory.SMOKE,
                                            cookies_file=None,
                                            localStorage=None,
                                            gif_output_path=False
                                        )

                                        # Verify the duplicate test was skipped
                                        assert len(result) == 1
                                        assert result[0].name == "Unique Test"

                                        # Verify the duplicate was logged
                                        mock_logger.info.assert_any_call("[task-id] Skipping duplicate test: Duplicate Test")
