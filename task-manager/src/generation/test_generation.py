import os
import re
import json

from typing import Optional, Any
from logging import getLogger
from tempfile import NamedTemporaryFile
from langchain_openai import ChatOpenAI
from browser_use import Agent, Browser, BrowserConfig
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from utils.dto import Product, Test, Epic, Feature, TestCategory, TEST_CATEGORIES_DESCRIPTION, TestStatus
from crypto.crypto import crypto_service
from utils.history_validator import validate_agent_history
from utils.s3_utils import upload_file_to_s3
from fixtures.authentification.get_auth_session import get_auth_session
from utils.constants import SEED


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


LLM_CLIENT = ChatOpenAI(
    model="gpt-4.1",
    timeout=120,
    temperature=0,
    frequency_penalty=0.3,
    seed=SEED,
)

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
    job_id: str,
    product: Product,
    epic: Epic,
    feature: Feature,
    category_of_test: TestCategory,
    cookies_file: str | None = None,
    localStorage: str | None = None,
) -> list[Test]:
    """
    Generate test cases for a specific category for a feature.

    Args:
        product: Product information
        epic: Epic information
        feature: Feature information
        category_of_test: Category of tests to generate
        cookies_file: Path to cookies file for browser automation
        localStorage: Path to localStorage file for browser automation
        gif_output_path: Path to store GIF output of browser automation

    Returns:
        List of generated tests
    """

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

    try:
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

        # NOTE: we do not provide a controller as models tend to provide better results when not constrained by a controller output model
        agent = Agent(
            task=PROMPT.format(
                product=product,
                epic=epic,
                feature=feature,
                url=feature.urls[0],
                category_of_test=category_of_test,
                test_categories_description="- ".join([f"{k}: {v}" for k, v in TEST_CATEGORIES_DESCRIPTION.items()]),
            ),
            llm=LLM_CLIENT,
            initial_actions=[{'go_to_url': {'url': feature.urls[0]}}, {'go_to_url': {'url': feature.urls[0]}}],
            browser_context=context,
            enable_memory=False,
            use_vision=False,
        )

        history = await agent.run(max_steps=10)

    except Exception as e:
        raise e

    finally:
        await context.close()
        await browser.close()

    with NamedTemporaryFile(suffix='.gif', delete=True) as temp_gif:
        from browser_use.agent.gif import create_history_gif
        create_history_gif(
            task="unused",
            history=history,
            output_path=temp_gif.name,
            show_task=False,
            show_logo=False,
            show_goals=False
        )

        # Upload GIF to S3
        s3_url = upload_file_to_s3(
            job_id=job_id,
            file_path=temp_gif.name,
            task_type="test",
            task_name=feature.name,
            additional_params=feature.model_dump(),
            extension="gif",
            content_type="image/gif",
        )
        if s3_url:
            logger.info(f"[{job_id}] Test Generation GIF uploaded to S3: {s3_url}")

    result = await validate_agent_history(
        job_id=job_id,
        history=history,
        task_name=f"generate tests for {feature.name}",
    )

    logger.info(f"[{job_id}] Test Generation Result: {result}")

    # Parse the test cases from the LLM response
    test_cases = _parse_test_cases(result)

    tests = []

    # Convert parsed test cases to Test objects
    for tc in test_cases:
        if feature.id is None:
            logger.warning(f"[{job_id}] Skipping test case '{tc['name']}' because feature ID is missing.")
            continue

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


async def generate_tests(
    ctx: dict[Any, Any],
    product: Product,
    epic: Epic,
    feature: Feature,
    secrets: Optional[list[dict[str, Any]]] = None,
) -> dict[str, Any]:
    """
    Endpoint to generate tests for a feature.

    Args:
        product: Product information
        epic: Epic information
        feature: Feature information
        background_task: Background tasks handler
        secrets: List of secret dictionaries for authentication
                 (expected to be encrypted if provided)

    Returns:
        Task ID for tracking the test generation process
    """

    product = Product(**product)
    epic = Epic(**epic)
    feature = Feature(**feature)
    decrypted_secrets: list[dict[str, Any]] = list()

    # Decrypt encrypted secrets if provided
    if secrets:
        try:
            decrypted_secrets = crypto_service.decrypt_secrets(secrets)
        except ValueError as e:
            logger.error(f"[{ctx['job_id']}] Failed to decrypt secrets: {e}")
            # Handle decryption failure, maybe return an error status
            output = {
                "results": [],
                "status": TestStatus.FAILED.value,
                "error": f"Failed to decrypt secrets: {e}"
            }
            return output

    # List of test categories to generate
    categories = [
        TestCategory.SMOKE,
    ]

    auth_session = dict()
    if feature.access_conditions is not None and feature.access_conditions.get("must_be_logged_in") is True:
        auth_session = await get_auth_session(
            task_id=ctx['job_id'],
            url=product.url,
            secrets=decrypted_secrets,  # Use decrypted secrets here
        )

    tests = []
    with NamedTemporaryFile(suffix=".json", mode="w+") as cookies_file:
        cookies_file.write(json.dumps(auth_session.get('cookies')))
        cookies_file.flush()
        cookies_file.seek(0)

        local_storage_data = auth_session.get('localStorage')
        local_storage_json = json.dumps(local_storage_data) if local_storage_data is not None else None

        for category in categories:
            category_tests = await _generate_test_category_for_feature(
                job_id=ctx['job_id'],
                product=product,
                epic=epic,
                feature=feature,
                category_of_test=category,
                cookies_file=cookies_file.name if auth_session.get('cookies') is not None else None,
                localStorage=local_storage_json,
            )
            tests.extend(category_tests)

    output = {
        "results": [_test.model_dump() | {'category': _test.category.value} for _test in tests],
        "status": TestStatus.PASSED.value,
    }

    logger.info(f"[{ctx['job_id']}] Test Generation Output: {output}")

    return output
