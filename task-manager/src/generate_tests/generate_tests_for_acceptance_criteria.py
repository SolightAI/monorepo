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
You are an AI assistant acting as a test automation engineer. Your task is to generate a suite of automated tests based on the provided product information, epic, feature, and acceptance criteria. Follow these instructions carefully to create well-structured, maintainable, and easy-to-understand test cases.

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

== Acceptance Criteria ==
Name: {acceptance_criteria.name}
Description: {acceptance_criteria.description}

URL of the page to start the test: {url}
Test Category: {category_of_test}

Analyze the provided information carefully. Pay special attention to the acceptance criteria, as this will be the primary basis for your test cases.

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
    secrets: dict[str, dict[str, str]] = None,
    gif_output_path: str | bool = False,
) -> list[Test]:

    # Setup for authenticated session if username_password secrets are available
    cookies_file = None
    localStorage_file = None
    
    if secrets and "username_password" in secrets and len(secrets["username_password"]) > 0:
        # Write cookies and localStorage to temporary files
        with NamedTemporaryFile(suffix=".json", delete=False) as cookies_file_obj, NamedTemporaryFile(
            suffix=".json", delete=False
        ) as localStorage_file_obj:
            cookies_file = cookies_file_obj.name
            localStorage_file = localStorage_file_obj.name
            
        await generate_auth_session(
            url=product.url,
            cookies_file=cookies_file,
            localStorage_file=localStorage_file,
            username=secrets["username_password"].get("username"),
            password=secrets["username_password"].get("password"),
        )
        
        logger.info(f"Generated auth session for {product.url}")

    try:
        # Setup browser config
        browser_config = BrowserConfig()
        browser = Browser(browser_config)
        
        # Create browser context with cookies if available
        context = BrowserContext(browser=browser, config=BrowserContextConfig(
            cookies_file=cookies_file,
            minimum_wait_page_load_time=1,
            viewport_expansion=0,
        ))
        
        # Initialize browser context
        await context.initialize()
        
        # Navigate to the feature URL to load localStorage
        await context.navigate_to(feature.urls[0])
        
        # Load localStorage if available
        if localStorage_file is not None:
            with open(localStorage_file, "r") as f:
                localStorage_data = json.load(f)
                
            load_script = """
            (storage => {
                for (let [key, value] of Object.entries(storage)) {
                    localStorage.setItem(key, value);
                }
                return localStorage.length;
            })(%s)
            """.strip() % json.dumps(localStorage_data)
            await context.execute_javascript(load_script)
        
        # Create a directory for GIF output if needed
        if gif_output_path:
            if isinstance(gif_output_path, bool):
                gif_output_path = "./"
            os.makedirs(gif_output_path, exist_ok=True)
        
        # Setup agent for test generation
        agent = Agent(context)
        
        # Create prompt for test case generation
        prompt = PROMPT.format(
            product=product,
            epic=epic,
            feature=feature,
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
        # Clean up temporary files
        if cookies_file:
            try:
                os.unlink(cookies_file)
            except Exception as e:
                logger.error(f"Failed to clean up cookies file: {e}")
        
        if localStorage_file:
            try:
                os.unlink(localStorage_file)
            except Exception as e:
                logger.error(f"Failed to clean up localStorage file: {e}")


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
    Generate tests for acceptance criteria in a background task.
    """
    logger.info(f"Starting background test generation task {task_id}")
    
    # Default to SMOKE tests if no categories specified
    if categories_of_test is None:
        categories_of_test = [TestCategory.SMOKE]
    
    # Initialize an empty list for test results
    tests = []
    
    try:
        # Generate tests for each category
        for category_of_test in categories_of_test:
            category_tests = await _generate_test_category_for_acceptance_criteria(
                product=product,
                epic=epic,
                feature=feature,
                acceptance_criteria=acceptance_criteria,
                category_of_test=category_of_test,
                secrets=secrets,
                gif_output_path=gif_output_path
            )
            tests.extend(category_tests)
            
        # Convert the tests to a serializable format - feature_id is the only ID we need
        serialized_tests = [
            {
                "name": test.name,
                "description": test.description,
                "url": test.url,
                "category": test.category,
                "status": test.status,
                "feature_id": test.feature_id,  # This still works since we kept Feature.id
                "preconditions": test.preconditions,
                "steps": test.steps,
                "expected_results": test.expected_results,
                "assertions": test.assertions
            }
            for test in tests
        ]
        
        # Store the result
        task_ids[task_id] = {
            "status": "completed",
            "results": serialized_tests
        }
        
        logger.info(f"Completed test generation task {task_id} with {len(tests)} tests")
        
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
    Generate test cases for a specific acceptance criteria, and return those cases.
    """
    task_id = str(uuid4())
    
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
