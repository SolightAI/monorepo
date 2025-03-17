import os
import re
import json
import asyncio
import functools
import traceback

from uuid import uuid4
from typing import Any
from pydantic import SecretStr
from logging import getLogger
from tempfile import NamedTemporaryFile
from langchain_openai import AzureChatOpenAI
from browser_use import Agent, Browser, BrowserConfig
from fixtures.generate_auth_session import generate_auth_session
from generate_tests.dto import Product, Test, Epic, Feature, UserStory, AcceptanceCriteria, TestCategory
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from fastapi import APIRouter, BackgroundTasks, HTTPException


PROMPT = """
You are an AI assistant acting as a test automation engineer. Your task is to generate a suite of automated tests based on the provided product information, epic, feature, user story, and acceptance criteria. Follow these instructions carefully to create well-structured, maintainable, and easy-to-understand test cases.

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

== User Story ==
User Story: {user_story.name}
Description: {user_story.description}

== Acceptance Criteria ==
Name: {acceptance_criteria.name}
Description: {acceptance_criteria.description}

URL of the page to start the test: {url}

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
    user_story: UserStory,
    acceptance_criteria: AcceptanceCriteria,
    category_of_test: TestCategory,
    cookies_file: str | None = None,
    localStorage: str | None = None,
    gif_output_path: str | bool = False,
) -> list[Test]:

    browser = Browser(
        config=BrowserConfig(
            headless=os.getenv("HEADLESS", "true").lower() == "true",
            chrome_instance_path=os.getenv("CHROME_INSTANCE_PATH", None)
        )
    )

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
        """.strip() % str(localStorage).replace("'", '"')
        await context.execute_javascript(load_script)

    if gif_output_path:
        os.makedirs(os.path.dirname(gif_output_path), exist_ok=True)

    # NOTE: we do not provide a controller as models tend to provide better results when not constrained by a controller output model
    agent = Agent(
        task=PROMPT.format(
            product=product,
            epic=epic,
            feature=feature,
            user_story=user_story,
            acceptance_criteria=acceptance_criteria,
            url=feature.urls[0],  # TODO: use all the urls
            category_of_test=category_of_test,
        ),
        llm=LLM_CLIENT,
        initial_actions=[{'go_to_url': {'url': feature.urls[0]}}, {'go_to_url': {'url': feature.urls[0]}}],
        browser_context=context,
        # generate_gif=gif_output_path,  # deactivated cause it leads to thread blocking
    )

    try:
        history = await agent.run(max_steps=100)
    finally:
        await context.close()
        await browser.close()

    result = history.final_result()  # type: ignore

    logger.info(f"{history.has_errors()=} {history.is_done()=} {result is None=} {history.is_successful()=}")
    if history.has_errors() or not history.is_done() or result is None or not history.is_successful():
        raise Exception("Failed to generate tests for acceptance criteria")

    if result is None:
        logger.error("Couldn't generate tests for acceptance criteria for %s", acceptance_criteria.name)
        logger.debug("History of the agent when generating tests for acceptance criteria for %s: %s", acceptance_criteria.name, history.action_results())
        raise Exception("Failed to generate tests for acceptance criteria, result is None")

    result = _parse_test_cases(result)

    return [_test | {'category': category_of_test, "acceptance_criteria_id": acceptance_criteria.id, "url": feature.urls[0]} for _test in result]


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
            logger.error(f"Error in background task {task_id}: {error_message}")
            logger.debug(f"Traceback: {error_traceback}")

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
    user_story: UserStory,
    acceptance_criteria: AcceptanceCriteria,
    categories_of_test: list[TestCategory],
    secrets: dict[str, dict[str, str]],
    gif_output_path: str | bool = False,
) -> list[Test]:

    logger.info(f"Generating cookies for {product.url}")

    try:
        auth_session = await generate_auth_session(
            url=product.url,
            secrets=secrets,
        )
    except Exception as e:
        logger.error(f"Error in background task {task_id}: {e}")
        raise

    logger.info(f"Generated cookies for {product.url}")

    coroutines = []

    with NamedTemporaryFile(delete=True, suffix='.json', mode='w+') as f:

        if auth_session['cookies'] is not None:
            json.dump(auth_session['cookies'], f)
            f.flush()
            f.seek(0)

        for category_of_test in categories_of_test:
            logger.info(f"Generating tests for {category_of_test.value} for {product.url}")
            coroutines.append(_generate_test_category_for_acceptance_criteria(
                product=product,
                epic=epic,
                feature=feature,
                user_story=user_story,
                acceptance_criteria=acceptance_criteria,
                category_of_test=category_of_test,
                cookies_file=f.name if auth_session.get('cookies') is not None else None,
                localStorage=auth_session.get('localStorage'),
                gif_output_path=gif_output_path if not gif_output_path else os.path.join(gif_output_path, f"{category_of_test.value}.gif"),
            ))

        logger.info(f"Gathering tests for {product.url}")
        results = await asyncio.gather(*coroutines)
        results = [_test for tests_per_category in results for _test in tests_per_category]
        logger.info(f"Gathered tests for {product.url}")

    task_ids[task_id] = {"status": "completed", "results": results}

    return results


@router.post("/generate-tests-for-acceptance-criteria")
async def generate_tests_for_acceptance_criteria(
    product: Product,
    epic: Epic,
    feature: Feature,
    user_story: UserStory,
    acceptance_criteria: AcceptanceCriteria,
    secrets: dict[str, dict[str, str]],
    background_task: BackgroundTasks,
) -> str:

    task_id = str(uuid4())

    background_task.add_task(
        background_generate_tests_for_acceptance_criteria,
        task_id=task_id,
        secrets=secrets,
        product=product,
        epic=epic,
        feature=feature,
        user_story=user_story,
        acceptance_criteria=acceptance_criteria,
        categories_of_test=[TestCategory.SMOKE],
    )

    task_ids[task_id] = {"status": "pending", "results": None}

    return task_id


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
