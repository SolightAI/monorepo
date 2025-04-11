import os
import json
import re
import functools
import traceback
from uuid import uuid4
from typing import Any, Optional
from pydantic import SecretStr
from logging import getLogger
from tempfile import NamedTemporaryFile
from langchain_openai import AzureChatOpenAI
from browser_use import Agent, Browser, BrowserConfig
from fixtures.authentification.get_auth_session import get_auth_session
from utils.dto import Product, Test, Epic, Feature, UserStory, AcceptanceCriteria, TestCategory, TEST_CATEGORIES_DESCRIPTION
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from fastapi import APIRouter, BackgroundTasks, HTTPException
from utils.crypto import crypto_service
from utils.task_status import task_status_manager
from utils.history_validator import validate_agent_history
from utils.s3_utils import upload_gif_to_s3


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
URL: {url}

== User Stories ==
{user_stories_text}

== Acceptance Criteria ==
{acceptance_criteria_text}

Analyze the provided information carefully. Pay special attention to the acceptance criteria, as this will be the primary basis for your test cases.

Generate a suite of {category_of_test} test cases that thoroughly cover the acceptance criteria. Each test case should:
1. Have a clear and descriptive title
2. Include a detailed description of what the test is verifying
3. List any preconditions or setup required
4. Provide step-by-step instructions for test execution
5. Specify the expected results for each step
6. Include any necessary assertions or validation points

Definition of test categories:
{test_categories_description}

Remember to generate tests only for the provided category of test ({category_of_test}). Ignore all the other categories.

When creating your test cases, keep the following best practices in mind:
- Ensure tests are independent and can be run in any order
- Use clear and consistent naming conventions
- Keep tests focused on a single aspect of functionality
- Consider both positive and negative test scenarios
- Include edge cases and boundary conditions where applicable

Some extra ground rules:
- Do not logout from the application in the test cases
- Do not exit from the application in the test cases
- Do not try to change the current url, the feature is accessible from the current url

Start by writing your thinking process in the <analysis> tags. It's more than ok the have a long analysis before writing your final answer.

<analysis>
[Your detailed analysis and reasoning for parameter selection]
</analysis>

Once your analysis is done, you should write your final answer in the <output> tags.
For each test case, you should write the following informations in the <test_case> tags, like this:

<output>
<test_case>
<name>Name of the test</name>
<description>Description of the test</description>
<preconditions>Preconditions or setup required</preconditions>
<steps>Step-by-step instructions for test execution</steps>
<assertions>Assertions or validation points</assertions>
</test_case>
...
</output>

Make sure to close each XML tag you open.
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


def _parse_test_cases(test_case_text: str) -> list[dict[str, str]]:
    """Parse the text returned from LLM into a list of test case dictionaries."""
    # Use regex to extract test cases
    test_cases = []
    pattern = r'<test_case>\s*<name>(.*?)</name>\s*<description>(.*?)</description>\s*<preconditions>(.*?)</preconditions>\s*<steps>(.*?)</steps>\s*<assertions>(.*?)</assertions>\s*</test_case>'

    matches = re.finditer(pattern, test_case_text, re.DOTALL)
    for match in matches:
        test_case = {
            'name': match.group(1).strip(),
            'description': match.group(2).strip(),
            'preconditions': match.group(3).strip(),
            'steps': match.group(4).strip(),
            'assertions': match.group(5).strip(),
        }
        test_cases.append(test_case)
    return test_cases


async def _generate_test_category_for_feature(
    task_id: str,
    product: Product,
    epic: Epic,
    feature: Feature,
    user_stories: list[UserStory],
    acceptance_criteria_list: list[AcceptanceCriteria],
    category_of_test: TestCategory,
    cookies_file: str | None = None,
    localStorage: str | None = None,
    gif_output_path: str | bool = False,
) -> list[Test]:
    """
    Generate test cases for a specific category for a feature.

    Args:
        product: Product information
        epic: Epic information
        feature: Feature information
        user_stories: List of user stories associated with the feature
        acceptance_criteria_list: List of acceptance criteria associated with the feature
        category_of_test: Category of tests to generate
        cookies_file: Path to cookies file for browser automation
        localStorage: Path to localStorage file for browser automation
        gif_output_path: Path to store GIF output of browser automation

    Returns:
        List of generated tests
    """

    # Format user stories and acceptance criteria for the prompt
    user_stories_text = "\n".join([
        f"User Story: {us.name}"
        for us in user_stories
    ])

    acceptance_criteria_text = "\n\n".join([
        f"Name: {ac.name}\nDescription: {ac.description}"
        for ac in acceptance_criteria_list
    ])

    # Configure the browser session with cookies and localStorage
    browser_config = BrowserConfig(
        headless=os.getenv("HEADLESS", "true").lower() == "true",
    )

    browser = Browser(browser_config)
    context = BrowserContext(browser=browser, config=BrowserContextConfig(
        cookies_file=cookies_file,
        minimum_wait_page_load_time=1,
        viewport_expansion=0,
    ))

    # TODO: not only on the first url, but on all the urls
    await context.navigate_to(feature.urls[0])  # allowing us to load the localStorage

    if localStorage is not None:
        load_script = """
        (storage => {
            Object.keys(storage).forEach(key => {
                localStorage.setItem(key, storage[key]);
            });
            return localStorage.length;
        })(%s)
        """.strip() % json.dumps(localStorage)
        await context.execute_javascript(load_script)

    if gif_output_path:
        os.makedirs(os.path.dirname(gif_output_path), exist_ok=True)

    # NOTE: we do not provide a controller as models tend to provide better results when not constrained by a controller output model
    agent = Agent(
        task=PROMPT.format(
            product=product,
            epic=epic,
            feature=feature,
            url=feature.urls[0],
            user_stories_text=user_stories_text,
            acceptance_criteria_text=acceptance_criteria_text,
            category_of_test=category_of_test,
            test_categories_description="- ".join([f"{k}: {v}" for k, v in TEST_CATEGORIES_DESCRIPTION.items()]),
        ),
        llm=LLM_CLIENT,
        initial_actions=[{'go_to_url': {'url': feature.urls[0]}}, {'go_to_url': {'url': feature.urls[0]}}],
        browser_context=context,
        enable_memory=False,
    )

    try:
        history = await agent.run(max_steps=30)
    finally:
        await context.close()
        await browser.close()

    from browser_use.agent.gif import create_history_gif  # import here to avoid thread blocking
    with NamedTemporaryFile(suffix='.gif', delete=True) as temp_gif:
        create_history_gif(
            task="a",
            history=history,
            output_path=temp_gif.name,
            show_task=False,
            show_logo=False,
            show_goals=False
        )

        # Upload GIF to S3
        s3_url = upload_gif_to_s3(
            task_id=task_id,
            file_path=temp_gif.name,
            task_type="test",
            task_name=feature.name,
            additional_params=feature.model_dump()
        )
        if s3_url:
            logger.info(f"[{task_id}] Test Generation GIF uploaded to S3: {s3_url}")

    result = await validate_agent_history(
        task_id=task_id,
        history=history,
        task_name=f"generate tests for {feature.name}",
    )

    logger.info(f"[{task_id}] Test Generation Result: {result}")

    # Parse the test cases from the LLM response
    test_cases = _parse_test_cases(result)

    tests = []

    # Convert parsed test cases to Test objects
    for tc in test_cases:
        test = Test(
            name=tc['name'],
            description=tc['description'],
            url=feature.urls[0],
            category=category_of_test,
            preconditions=tc['preconditions'],
            steps=tc['steps'],
            assertions=tc['assertions'],
            feature_id=feature.id,
        )
        tests.append(test)

    return tests


def handle_background_task_errors(func):
    """Decorator to handle background task errors."""
    @functools.wraps(func)
    async def wrapper(task_id: str, *args, **kwargs):
        try:
            task_status_manager.set_status(task_id, "pending")
            results = await func(task_id, *args, **kwargs)
            task_status_manager.set_status(task_id, "completed", results=results)
            return results
        except Exception as e:
            error_message = str(e)
            stack_trace = traceback.format_exc()
            logger.error(f"[{task_id}] Error in background task: {error_message}\n{stack_trace}")
            task_status_manager.set_status(task_id, "error", error=error_message)
            raise e

    wrapper.get_status = lambda task_id: task_status_manager.get_status(task_id)
    return wrapper


@handle_background_task_errors
async def background_generate_tests_for_feature(
    task_id: str,
    product: Product,
    epic: Epic,
    feature: Feature,
    user_stories: list[UserStory],
    acceptance_criteria_list: list[AcceptanceCriteria],
    categories_of_test: list[TestCategory],
    secrets: dict[str, dict[str, str]],
    gif_output_path: str | bool = False,
) -> list[Test]:
    """
    Background task to generate tests for a feature.

    Args:
        task_id: Task ID for tracking
        product: Product information
        epic: Epic information
        feature: Feature information
        user_stories: List of user stories associated with the feature
        acceptance_criteria_list: List of acceptance criteria associated with the feature
        categories_of_test: List of test categories to generate
        secrets: Dictionary of secrets for authentication
        gif_output_path: Path to store GIF output of browser automation

    Returns:
        List of generated tests
    """

    auth_session = dict()
    if secrets is not None and len(secrets) > 0:
        auth_session = await get_auth_session(
            task_id=task_id,
            url=product.url,
            secrets=secrets,
        )

    tests = []
    with NamedTemporaryFile(suffix=".json", mode="w+") as cookies_file:
        cookies_file.write(json.dumps(auth_session.get('cookies')))
        cookies_file.flush()
        cookies_file.seek(0)

        for category in categories_of_test:
            category_tests = await _generate_test_category_for_feature(
                task_id=task_id,
                product=product,
                epic=epic,
                feature=feature,
                user_stories=user_stories,
                acceptance_criteria_list=acceptance_criteria_list,
                category_of_test=category,
                cookies_file=cookies_file.name if auth_session.get('cookies') is not None else None,
                localStorage=auth_session.get('localStorage'),
                gif_output_path=gif_output_path,
            )
            tests.extend(category_tests)

    return tests


@router.post("/generate-tests-for-feature")
async def generate_tests_for_feature(
    product: Product,
    epic: Epic,
    feature: Feature,
    user_stories: list[UserStory],
    acceptance_criteria: list[AcceptanceCriteria],
    background_task: BackgroundTasks,
    encrypted_secrets: Optional[dict[str, dict[str, str]]] = None,
) -> str:
    """
    Endpoint to generate tests for a feature.

    Args:
        product: Product information
        epic: Epic information
        feature: Feature information
        user_stories: List of user stories associated with the feature
        acceptance_criteria: List of acceptance criteria associated with the feature
        background_task: Background tasks handler
        secrets: Dictionary of secrets for authentication
        encrypted_secrets: Dictionary of encrypted secrets for authentication

    Returns:
        Task ID for tracking the test generation process
    """
    task_id = str(uuid4())

    if len(user_stories) == 0:
        raise HTTPException(status_code=400, detail="No user stories provided")

    if len(acceptance_criteria) == 0:
        raise HTTPException(status_code=400, detail="No acceptance criteria provided")

    # Decrypt secrets if provided
    secrets_to_use = None

    if encrypted_secrets:
        try:
            secrets_to_use = crypto_service.decrypt_secrets(encrypted_secrets)
            if not secrets_to_use:
                raise HTTPException(status_code=400, detail="No secrets provided")
        except Exception as e:
            logger.error(f"[{task_id}] Failed to decrypt secrets: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to decrypt secrets: {str(e)}")

    # List of test categories to generate
    categories = [
        TestCategory.SMOKE,
    ]

    background_task.add_task(
        background_generate_tests_for_feature,
        task_id=task_id,
        product=product,
        epic=epic,
        feature=feature,
        user_stories=user_stories,
        acceptance_criteria_list=acceptance_criteria,
        categories_of_test=categories,
        secrets=secrets_to_use or {},
        gif_output_path="/tmp",
    )

    return task_id


@router.get("/get-test-generation-status/{task_id}")
async def get_test_generation_status(
    task_id: str,
) -> dict[str, Any]:
    """
    Get the status of a test generation task.

    Args:
        task_id: Task ID to check

    Returns:
        Dictionary with task status information
    """
    status = task_status_manager.get_status(task_id)
    return status


# TODO: Test both w/ and w/o the browser-use to see what leads to better results
# TODO: give access to doc RAD so the agent can ask questions about the product
# TODO: give a Laneo doc for LLMs (super useful both for cursor and for the QA agent)
