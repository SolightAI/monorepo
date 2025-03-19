import os
import re
import json
import asyncio
import functools
import traceback
from uuid import uuid4
from typing import Any, Optional
from pydantic import SecretStr
from logging import getLogger
from tempfile import NamedTemporaryFile
from langchain_openai import AzureChatOpenAI
from browser_use import Agent, Browser, BrowserConfig
from fixtures.generate_auth_session import generate_auth_session
from generate_tests.dto import Product, Test, Epic, Feature, UserStory, AcceptanceCriteria, TestCategory, TestStatus
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from fastapi import APIRouter, BackgroundTasks, HTTPException
from utils.crypto import crypto_service


PROMPT = """
You are an AI assistant acting as a test automation engineer. Your task is to generate a suite of automated tests based on the provided product information, epic, feature, user stories, and acceptance criteria. Follow these instructions carefully to create well-structured, maintainable, and easy-to-understand test cases.

First, review the following information:

== Product ==
Project: {product.name}
URL: {product.url}
Description: {product.description}

== Epic ==
Name: {epic.name}
Description: {epic.description}

== Feature ==
Name: {feature.name}
Description: {feature.description}

== User Stories ==
{user_stories_text}

== Acceptance Criteria ==
Name: {acceptance_criteria.name}
Description: {acceptance_criteria.description}

URL of the page to start the test: {url}
Test Category: {category_of_test}

Analyze the provided information carefully. Pay special attention to the acceptance criteria and user stories, as these will be the primary basis for your test cases.

Generate a suite of {category_of_test} test cases that thoroughly cover the acceptance criteria. Each test case should:
1. Have a clear and descriptive title
2. Include a detailed description of what the test is verifying
3. List any preconditions or setup required
4. Provide step-by-step instructions for test execution
5. Specify the expected results for each step
6. Include any necessary assertions or validation points

When creating your test cases, keep the following best practices in mind:
- Ensure tests are independent and can be run in any order
- Use clear and consistent naming conventions
- Keep tests focused on a single aspect of functionality
- Consider both positive and negative test scenarios
- Include edge cases and boundary conditions where applicable

Some extra ground rules:
- Do not logout from the application in the test cases
- Do not exit from the application in the test cases
- If you need to login, stop by raising an exception to the user
- If you're on an unrelated page, stop by raising an exception to the user

On your final response, for each test case, you should write the following informations in the following format:
<test_case>
<name>Name of the test</name>
<description>Description of the test</description>
<preconditions>Preconditions or setup required</preconditions>
<steps>Step-by-step instructions for test execution</steps>
<expected_results>Expected results for each step</expected_results>
<assertions>Assertions or validation points</assertions>
</test_case>
...
""".strip()


if (azure_openai_key := os.getenv('AZURE_OPENAI_KEY')) is None:
    raise ValueError('AZURE_OPENAI_KEY is not set')

if (azure_openai_endpoint := os.getenv('AZURE_OPENAI_ENDPOINT')) is None:
    raise ValueError('AZURE_OPENAI_ENDPOINT is not set')


LLM_CLIENT = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=azure_openai_endpoint,
    api_key=SecretStr(azure_openai_key),
    temperature=0.0,
)


router = APIRouter(prefix="/generate-tests")
logger = getLogger(__name__)
task_ids = {}


def _parse_test_cases(test_case_text: str) -> list[dict[str, str]]:
    """Parse test cases from the model's response.

    Args:
        test_case_text: The full text response containing one or more test cases

    Returns:
        A list of dictionaries representing the parsed test cases
    """
    # Find all test case blocks in the response
    test_case_pattern = r'<test_case>(.*?)</test_case>'
    test_case_blocks = re.findall(test_case_pattern, test_case_text, re.DOTALL)

    parsed_tests = []

    for test_block in test_case_blocks:
        # Extract components for each test case
        name_match = re.search(r'<name>(.*?)</name>', test_block, re.DOTALL)
        description_match = re.search(r'<description>(.*?)</description>', test_block, re.DOTALL)
        preconditions_match = re.search(r'<preconditions>(.*?)</preconditions>', test_block, re.DOTALL)
        steps_match = re.search(r'<steps>(.*?)</steps>', test_block, re.DOTALL)
        expected_results_match = re.search(r'<expected_results>(.*?)</expected_results>', test_block, re.DOTALL)
        assertions_match = re.search(r'<assertions>(.*?)</assertions>', test_block, re.DOTALL)

        # Only add the test if all required fields are present
        if not all([name_match, description_match, preconditions_match, steps_match, expected_results_match, assertions_match]):
            raise ValueError('Missing required fields in test case %s', test_block)

        parsed_tests.append({
            'name': name_match.group(1).strip(),
            'description': description_match.group(1).strip(),
            'preconditions': preconditions_match.group(1).strip(),
            'steps': steps_match.group(1).strip(),
            'expected_results': expected_results_match.group(1).strip(),
            'assertions': assertions_match.group(1).strip(),
        })

    if len(parsed_tests) == 0:
        raise ValueError('No tests found when parsing the response')

    return parsed_tests


async def _generate_test_category_for_acceptance_criteria(
    product: Product,
    epic: Epic,
    feature: Feature,
    acceptance_criteria: AcceptanceCriteria,
    category_of_test: TestCategory,
    auth_session: dict = None,
    gif_output_path: str | bool = False,
) -> list[Test]:

    # Setup browser and auth session
    browser_config = BrowserConfig()
    browser = Browser(browser_config)
    
    context_config = BrowserContextConfig(
        minimum_wait_page_load_time=1,
        viewport_expansion=0,
    )
    
    try:
        # Create browser context
        context = BrowserContext(browser=browser, config=context_config)
        
        # Initialize browser context
        await context.initialize()
        
        # Navigate to the feature URL
        await context.navigate_to(feature.urls[0])
        
        # Load cookies if available
        if auth_session and auth_session.get('cookies'):
            with NamedTemporaryFile(delete=True, suffix='.json', mode='w+') as cookies_file:
                json.dump(auth_session['cookies'], cookies_file)
                cookies_file.flush()
                cookies_file.seek(0)
                
                # Apply cookies to the browser context
                await context.load_cookies(cookies_file.name)
        
        # Load localStorage if available
        if auth_session and auth_session.get('localStorage'):
            load_script = """
            (storage => {
                for (let [key, value] of Object.entries(storage)) {
                    localStorage.setItem(key, value);
                }
                return localStorage.length;
            })(%s)
            """.strip() % json.dumps(auth_session.get('localStorage'))
            await context.execute_javascript(load_script)
        
        # Create a directory for GIF output if needed
        if gif_output_path:
            if isinstance(gif_output_path, bool):
                gif_output_path = "./"
            os.makedirs(gif_output_path, exist_ok=True)
        
        # Setup agent for test generation
        agent = Agent(context)
        
        # Format user stories text
        user_stories_text = ""
        if hasattr(feature, 'user_stories') and feature.user_stories:
            for i, story in enumerate(feature.user_stories, 1):
                user_stories_text += f"User Story {i}: {story.name}\n"
                user_stories_text += f"Description: {story.description}\n\n"
        else:
            user_stories_text = "No user stories defined for this feature."
        
        # Create prompt for test case generation
        prompt = PROMPT.format(
            product=product,
            epic=epic,
            feature=feature,
            user_stories_text=user_stories_text,
            acceptance_criteria=acceptance_criteria,
            url=feature.urls[0],
            category_of_test=category_of_test,
        )
        
        # Actually run the agent
        output = await agent.run(prompt)
        
        # Parse test cases from output
        parsed_tests = _parse_test_cases(output)
        
        # Create Test objects
        tests = []
        for test_case in parsed_tests:
            test = Test(
                name=test_case["name"],
                description=test_case["description"],
                url=feature.urls[0],  # Default to the first URL
                category=category_of_test,
                status=TestStatus.PASSED,  # Default to PASSED
                feature_id=feature.id,  # Important: This sets feature_id from the feature object
                preconditions=test_case.get("preconditions", ""),
                steps=test_case.get("steps", ""),
                expected_results=test_case.get("expected_results", ""),
                assertions=test_case.get("assertions", "")
            )
            tests.append(test)
            
        return tests
        
    finally:
        # Clean up browser resources
        if 'context' in locals():
            await context.close()
        if 'browser' in locals():
            await browser.close()


def handle_background_task_errors(func):
    """
    Decorator for background task functions that handles errors and updates task_ids.

    Args:
        func: The async function to wrap. The first argument must be task_id.

    Returns:
        An async function wrapped with error handling that updates task_ids.
    """
    @functools.wraps(func)
    async def wrapper(task_id: str, *args, **kwargs):
        try:
            return await func(task_id, *args, **kwargs)
        except Exception as e:
            error_message = str(e)
            error_traceback = traceback.format_exc()
            logger.error(f"Error in background task {task_id}: Error: {error_message} Traceback: {error_traceback}")

            # Update task_ids to indicate failure
            task_ids[task_id] = {
                "status": "error",
                "results": None,
                "error": error_message,
                "traceback": error_traceback
            }

            return None

    return wrapper


@handle_background_task_errors
async def background_generate_tests_for_acceptance_criteria(
    task_id: str,
    product: Product,
    epic: Epic,
    feature: Feature,
    acceptance_criteria: AcceptanceCriteria,
    secrets: dict[str, dict[str, str]] = None,
    categories_of_test: list[TestCategory] = None,
    gif_output_path: str | bool = False,
):
    """
    Background task to generate tests for an acceptance criteria.
    
    This function runs in the background and generates test cases for the given acceptance criteria.
    It generates tests for each category in the list of categories provided.
    
    Args:
        task_id: UUID of the task
        product: Product data
        epic: Epic data
        feature: Feature data with user stories
        acceptance_criteria: Acceptance criteria to generate tests for
        secrets: Dictionary of secrets to use for authentication
        categories_of_test: List of test categories to generate
        gif_output_path: Path to save GIF output to, or False to disable GIF output
    """
    # Use the default list of categories if none provided
    if categories_of_test is None:
        categories_of_test = [TestCategory.SMOKE]
    
    # Generate auth session if username/password secrets are available
    auth_session = None
    if secrets and "username_password" in secrets and len(secrets["username_password"]) > 0:
        try:
            logger.info(f"Generating auth session for {product.url}")
            auth_session = await generate_auth_session(
                url=product.url,
                username=secrets["username_password"].get("username"),
                password=secrets["username_password"].get("password"),
            )
            logger.info(f"Generated auth session for {product.url}")
        except Exception as e:
            logger.error(f"Failed to generate auth session: {e}")
            raise e
    
    try:
        results = []
        
        for category in categories_of_test:
            logger.info(f"Generating {category} tests for acceptance criteria {acceptance_criteria.id}")
            
            tests = await _generate_test_category_for_acceptance_criteria(
                product=product,
                epic=epic,
                feature=feature,
                acceptance_criteria=acceptance_criteria,
                category_of_test=category,
                auth_session=auth_session,
                gif_output_path=gif_output_path,
            )
            
            # Add results
            for test in tests:
                test_dict = test.model_dump()
                test_dict["category"] = category
                test_dict["feature_id"] = feature.id
                results.append(test_dict)
                
            logger.info(f"Generated {len(tests)} {category} tests for acceptance criteria {acceptance_criteria.id}")
        
        # Store the result
        task_ids[task_id] = {
            "status": "completed",
            "results": results
        }
        
        logger.info(f"Completed test generation task {task_id} with {len(results)} tests")
        
    except Exception as e:
        logger.error(f"Failed to generate tests in task {task_id}: {str(e)}")
        task_ids[task_id] = {
            "status": "failed",
            "error": str(e)
        }


@router.post("/generate-tests-for-acceptance-criteria")
async def generate_tests_for_acceptance_criteria(
    product: Product,
    epic: Epic,
    feature: Feature,
    acceptance_criteria: AcceptanceCriteria,
    background_tasks: BackgroundTasks,
    secrets: Optional[dict[str, dict[str, str]]] = None,
    encrypted_secrets: Optional[dict[str, dict[str, str]]] = None,
) -> dict:
    """
    Generate tests for an acceptance criteria.
    
    This endpoint starts a background task that generates test cases for the given acceptance criteria.
    The test cases are generated using an AI agent that analyzes the provided information.
    
    Product, Epic, Feature, and AcceptanceCriteria models should be provided.
    The Feature should include any associated UserStories that provide context for test generation.
    
    Args:
        product: Product data for context
        epic: Epic data
        feature: Feature with associated user stories
        acceptance_criteria: Acceptance criteria to generate tests for
        background_tasks: FastAPI background tasks
        secrets: Dictionary of secrets to use for authentication
        encrypted_secrets: Dictionary of encrypted secrets
        
    Returns:
        Dictionary with the task_id for status polling
    """
    # Create unique ID for this task
    task_id = str(uuid4())
    
    # Prepare the task metadata
    task_ids[task_id] = {
        "status": "starting",
        "results": []
    }

    # Decrypt encrypted secrets if provided
    if encrypted_secrets:
        try:
            # Decrypt the secrets
            secrets = crypto_service.decrypt_secrets(encrypted_secrets)
            logger.info("Successfully decrypted secrets for test generation")
        except Exception as e:
            logger.error(f"Failed to decrypt secrets: {str(e)}")
            raise HTTPException(status_code=400, detail="Failed to decrypt secrets")

    # Ensure we have secrets
    if not secrets:
        secrets = {}

    background_tasks.add_task(
        background_generate_tests_for_acceptance_criteria,
        task_id=task_id,
        product=product,
        epic=epic,
        feature=feature,
        acceptance_criteria=acceptance_criteria,
        secrets=secrets,
    )

    # Immediately store the task as pending
    task_ids[task_id] = {"status": "pending"}

    return {
        "task_id": task_id,
        "status": "pending"
    }


@router.get("/get-test-generation-status/{task_id}")
async def get_test_generation_status(
    task_id: str,
) -> dict[str, Any]:

    if task_id not in task_ids:
        raise HTTPException(status_code=404, detail="Task not found")

    return task_ids[task_id]


# TODO: Test both w/ and w/o the browser-use to see what leads to better results
# TODO: give access to doc RAD so the agent can ask questions about the product
# TODO: give a Laneo doc for LLMs (super useful both for cursor and for the QA agent)
