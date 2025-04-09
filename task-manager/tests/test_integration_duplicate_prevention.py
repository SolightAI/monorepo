import pytest
import os
import sys
import json
from unittest.mock import patch, AsyncMock
import requests
from uuid import uuid4

# Import modules from src directory
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.generate_tests.generate_tests_for_feature import (
    background_generate_tests_for_feature
)
from src.utils.dto import Product, Epic, Feature, UserStory, AcceptanceCriteria, TestCategory


class MockResponse:
    """Mock HTTP response for testing."""
    def __init__(self, status_code, json_data):
        self.status_code = status_code
        self._json_data = json_data
        self.text = json.dumps(json_data)

    def json(self):
        return self._json_data


@pytest.mark.asyncio
async def test_integration_duplicate_prevention():
    """
    Integration test for the full duplicate prevention flow.

    This test mocks HTTP responses to simulate the API behavior,
    but tests the actual logic flow in the task manager.
    """
    # Create test IDs
    task_id = str(uuid4())
    feature_id = str(uuid4())
    epic_id = str(uuid4())
    product_id = str(uuid4())

    # Create feature, epic, product, etc.
    feature = Feature(
        id=feature_id,
        name="Login Feature",
        description="User login functionality",
        urls=["http://example.com/login"],
        dependencies=[],
        dependents=[]
    )

    epic = Epic(
        id=epic_id,
        name="Authentication Epic",
        description="User authentication features"
    )

    product = Product(
        id=product_id,
        name="Example App",
        url="http://example.com",
        description="Example application for testing",
        documentation="",
        links_to_documentation=[]
    )

    user_story = UserStory(
        id=str(uuid4()),
        name="Login User Story",
        description="As a user, I want to log in to access my account"
    )

    acceptance_criteria = AcceptanceCriteria(
        id=str(uuid4()),
        name="Valid Login",
        description="User can log in with valid credentials"
    )

    # Mock tests from the same epic (existing tests)
    existing_tests = [
        {
            "id": str(uuid4()),
            "name": "Login with valid credentials",
            "description": "Test login with valid username and password",
            "feature_id": str(uuid4()),  # Different feature
            "steps": "1. Navigate to login page\n2. Enter valid username and password\n3. Click login button",
            "category": "SMOKE",
            "preconditions": "User has an account",
            "expected_results": "User is logged in successfully",
            "assertions": "User is redirected to dashboard"
        },
        {
            "id": str(uuid4()),
            "name": "Login with invalid credentials",
            "description": "Test login with invalid username and password",
            "feature_id": str(uuid4()),  # Different feature
            "steps": "1. Navigate to login page\n2. Enter invalid username and password\n3. Click login button",
            "category": "SMOKE",
            "preconditions": "None",
            "expected_results": "Error message is displayed",
            "assertions": "User remains on login page"
        }
    ]

    # Define test cases that will be "generated" by the model
    # First one is a duplicate of an existing test
    mock_test_cases = [
        {
            "name": "Login with valid credentials",  # Duplicate name
            "description": "Test user login with valid credentials",
            "preconditions": "User exists in the system",
            "steps": "1. Go to login page\n2. Enter valid username and password\n3. Press login button",  # Similar steps
            "expected_results": "User should be logged in successfully",
            "assertions": "User should be redirected to the dashboard"
        },
        {
            "name": "Remember me functionality",  # Unique test
            "description": "Test the remember me functionality",
            "preconditions": "User exists in the system",
            "steps": "1. Go to login page\n2. Enter valid credentials\n3. Check 'Remember me' box\n4. Click login\n5. Close browser and reopen",
            "expected_results": "User should remain logged in",
            "assertions": "User should not have to log in again"
        }
    ]

    # Setup mock responses for HTTP requests

    # 1. Mock the API response for getting tests by epic
    def mock_get(*args, **kwargs):
        url = args[0]
        if f"/tests/by-epic/{epic_id}" in url:
            return MockResponse(200, existing_tests)
        return MockResponse(404, {"detail": "Not found"})

    # 2. Mock the API response for checking duplicates
    def mock_post(*args, **kwargs):
        url = args[0]
        if "/tests/check-duplicate" in url:
            data = kwargs.get("json", {})
            # Check if this is the first test (duplicate)
            if "Login with valid credentials" in data.get("test_name", ""):
                return MockResponse(200, {
                    "is_duplicate": True,
                    "duplicate_id": existing_tests[0]["id"],
                    "similarity_score": 0.85
                })
            # Otherwise it's the second test (not a duplicate)
            return MockResponse(200, {
                "is_duplicate": False,
                "duplicate_id": None,
                "similarity_score": None
            })
        return MockResponse(404, {"detail": "Not found"})

    # Use complex patching to mock the necessary components without running actual browser automation
    with patch('requests.get', side_effect=mock_get):
        with patch('requests.post', side_effect=mock_post):
            # Mock browser components
            with patch('src.generate_tests.generate_tests_for_feature.Browser') as mock_browser:
                with patch('src.generate_tests.generate_tests_for_feature.BrowserContext') as mock_context:
                    with patch('src.generate_tests.generate_tests_for_feature.Agent') as mock_agent:
                        # Mock agent history validation to return a "generated" response
                        with patch('src.generate_tests.generate_tests_for_feature.validate_agent_history', return_value="Generated test cases"):
                            # Mock test case parsing to return our predefined test cases
                            with patch('src.generate_tests.generate_tests_for_feature._parse_test_cases', return_value=mock_test_cases):
                                # Setup browser mocks
                                mock_context_instance = AsyncMock()
                                mock_context.return_value = mock_context_instance
                                mock_browser_instance = AsyncMock()
                                mock_browser.return_value = mock_browser_instance

                                # Setup agent mock
                                mock_agent_instance = AsyncMock()
                                mock_agent.return_value = mock_agent_instance
                                mock_agent_instance.run.return_value = []

                                # Mock create_history_gif to avoid creating actual files
                                with patch('src.generate_tests.generate_tests_for_feature.create_history_gif'):
                                    # Mock S3 upload
                                    with patch('src.generate_tests.generate_tests_for_feature.upload_gif_to_s3', return_value="http://example.com/gif.gif"):
                                        # Also mock the auth session generation
                                        with patch('src.generate_tests.generate_tests_for_feature.generate_auth_session', return_value={"cookies": {}, "localStorage": {}}):
                                            # Mock logger to capture log messages
                                            with patch('src.generate_tests.generate_tests_for_feature.logger') as mock_logger:
                                                # Run the test generation
                                                result = await background_generate_tests_for_feature(
                                                    task_id=task_id,
                                                    product=product,
                                                    epic=epic,
                                                    feature=feature,
                                                    user_stories=[user_story],
                                                    acceptance_criteria_list=[acceptance_criteria],
                                                    categories_of_test=[TestCategory.SMOKE],
                                                    secrets={},
                                                    gif_output_path=False
                                                )

                                                # VERIFICATION

                                                # 1. Verify that tests from the same epic were requested
                                                requests.get.assert_any_call(f"{os.getenv('API_URL', 'http://localhost:8000')}/tests/by-epic/{epic_id}")

                                                # 2. Verify that duplicate check was called for both test cases
                                                assert requests.post.call_count >= 2

                                                # 3. Verify the duplicate test was skipped
                                                assert len(result) == 1
                                                assert "Remember me functionality" in result[0].name

                                                # 4. Verify the duplicate was logged
                                                mock_logger.info.assert_any_call(f"[{task_id}] Skipping duplicate test: Login with valid credentials")

                                                # 5. Verify the agent prompt included existing tests
                                                # Extract prompt from agent call
                                                prompt = mock_agent.call_args[1]['task']
                                                assert "== Existing Tests in Related Features ==" in prompt
                                                assert "Login with valid credentials" in prompt
                                                assert "Login with invalid credentials" in prompt
                                                assert "Please avoid creating duplicate tests" in prompt
