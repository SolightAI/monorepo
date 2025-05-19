import json
import logging
import re

from lmnr import observe, Laminar
from typing import Optional
from tempfile import NamedTemporaryFile
from browser_use import Agent, AgentHistoryList
from browser_use.browser.browser import Browser, BrowserConfig
from browser_use.browser.context import BrowserContext, BrowserContextConfig

from langchain_openai import ChatOpenAI

from src.common.s3_client import S3Client
from src.common.dto import (
    Product,
    Epic,
    Feature,
    Test,
    TestCategory,
    TEST_CATEGORIES_DESCRIPTION,
)

logger = logging.getLogger(__name__)

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

@observe()
async def run(
    job_id: str,
    s3_client: S3Client,
    product: Product,
    epic: Epic,
    feature: Feature,
    test_category: TestCategory,
    cookies_file: str | None = None,
    local_storage: str | None = None,
    headless: bool = True,
) -> list[Test]:
    Laminar.set_session(session_id=job_id)
    Laminar.set_metadata({"task_id": job_id, "job": "generate_tests.run"})    
    
    logger.info(f"Setting up agent to run on {epic.name}/{product.name}/{feature.name}")

    agent_client = ChatOpenAI(
        model="gpt-4.1",
        timeout=120,
        temperature=0,
        frequency_penalty=0.3,
    )

    browser, context = _configure_browser(headless, cookies_file)

    try:
        await context.navigate_to(
            feature.urls[0]
        )  # allowing us to load the localStorage

        if local_storage is not None:
            await _set_items_in_browser_local_storage(context, local_storage)

        # NOTE: we do not provide a controller as models tend to provide better results when not constrained by a controller output model
        agent = Agent(
            task=PROMPT.format(
                product=product,
                epic=epic,
                feature=feature,
                url=feature.urls[0],
                category_of_test=test_category.value,
                test_categories_description="- ".join(
                    [f"{k}: {v}" for k, v in TEST_CATEGORIES_DESCRIPTION.items()]
                ),
            ),
            llm=agent_client,
            initial_actions=[
                {"go_to_url": {"url": feature.urls[0]}},
                {"go_to_url": {"url": feature.urls[0]}},
            ],
            browser_context=context,
            enable_memory=False,
            use_vision=False,
        )

        history = await agent.run(max_steps=10)
    except Exception as e:
        logger.error(f"Error generating tests: {e}")
        raise e
    finally:
        await context.close()
        await browser.close()

    with NamedTemporaryFile(suffix=".gif", delete=True) as temp_gif:  # type: ignore
        from browser_use.agent.gif import create_history_gif  # import here to avoid thread blocking
        
        
        create_history_gif(
            task="unused",
            history=history,
            output_path=temp_gif.name,
            show_task=False,
            show_logo=False,
            show_goals=False,
        )

        s3_url = s3_client.upload_file(
            file_path=temp_gif.name,
            object_name=f"{job_id}/{feature.name}.gif",
            additional_params=feature.model_dump(),
            content_type="image/gif",
        )

        logger.info(f"[{job_id}] Test Generation GIF uploaded to S3: {s3_url}")

    result = _validate_agent_history(
        job_id=job_id,
        history=history,
        task_name=f"generate tests for {feature.name}",
    )
    if result is None:
        raise Exception(f"[{job_id}] Failed to generate tests for {feature.name}")

    logger.info(f"[{job_id}] Test Generation Output: {result}")

    test_cases = _parse_test_cases(result)
    tests: list[Test] = []
    for tc in test_cases:
        if feature.id is None:
            logger.warning(
                f"[{job_id}] Skipping test case '{tc['name']}' because feature ID is missing."
            )
            continue

        test = Test(
            name=tc["name"],
            description=tc["description"],
            url=feature.urls[0],
            category=test_category,
            preconditions=tc["preconditions"],
            steps=tc["steps"],
            assertions=tc["assertions"],
            feature_id=feature.id,
        )

        tests.append(test)

    return tests


def _parse_test_cases(test_case_text: str) -> list[dict[str, str]]:
    """
    Parse the text returned from LLM into a list of test case dictionaries.

    Args:
        test_case_text: The text to parse

    Returns:
        A list of test case dictionaries
    """

    # Use regex to extract test cases
    test_cases = []
    pattern = r"<test_case>\s*<name>(.*?)</name>\s*<description>(.*?)</description>\s*<preconditions>(.*?)</preconditions>\s*<steps>(.*?)</steps>\s*<assertions>(.*?)</assertions>\s*</test_case>"

    matches = re.finditer(pattern, test_case_text, re.DOTALL)
    for match in matches:
        test_case = {
            "name": match.group(1).strip(),
            "description": match.group(2).strip(),
            "preconditions": match.group(3).strip(),
            "steps": match.group(4).strip(),
            "assertions": match.group(5).strip(),
        }

        test_cases.append(test_case)

    return test_cases


def _validate_agent_history(
    job_id: str,
    history: AgentHistoryList,
    task_name: str,
    error_markers: Optional[list[str]] = None,
    empty_result_is_ok: bool = False,
) -> str | None:
    """
    Validate the history of an agent run and extract the final result.

    Args:
        history: The agent history object from the run
        task_name: Name of the task being performed (e.g., "login", "generate features")
        error_markers: Optional list of strings in the result that indicate an error

    Returns:
        The final result from the history

    Raises:
        Exception: If the history validation fails for any reason
    """

    if error_markers is not None and not isinstance(error_markers, list):
        raise ValueError("error_markers must be a list")

    result = history.final_result()

    # Check if the task completed
    if not history.is_done():
        error_msg = f"[{job_id}] Failed to {task_name}, history is not done."
        error_msg += f" {result}"
        logger.error(error_msg)
        raise Exception(error_msg)

    # Check if the task was successful
    if not history.is_successful():
        error_msg = f"[{job_id}] Failed to {task_name}, history is not successful."
        error_msg += f" {result}"
        logger.error(error_msg)

        raise Exception(error_msg)

    # Check if the result is empty and empty_result_is_ok is False
    if not empty_result_is_ok and result is None:
        error_msg = f"[{job_id}] Failed to {task_name}, result is None."
        error_msg += f" {result}"
        logger.error(error_msg)
        raise Exception(error_msg)

    # Check for custom error marker in the result
    if error_markers is not None:
        for _error_marker in error_markers:
            if result is not None and _error_marker in result:
                error_msg = f"[{job_id}] Failed to {task_name}, {_error_marker} found in result."
                error_msg += f" {result}"
                logger.error(error_msg)
                raise Exception(error_msg)

    return result


def _configure_browser(
    headless: bool = True, cookie_file: str | None = None
) -> tuple[Browser, BrowserContext]:
    """
    Configure and return a ready to use browser with its context.

    Args:
        headless (bool): Whether to run the browser in headless mode.
        cookie_file (str | None): Path to the cookie file for the browser.

    Returns:
        tuple: A tuple containing the browser and context.
    """
    browser = Browser(
        config=BrowserConfig(
            headless=headless,
            extra_browser_args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--single-process",
                "--no-zygote",
                "--disable-setuid-sandbox",
            ],
        )
    )

    context = BrowserContext(
        browser=browser,
        config=BrowserContextConfig(
            cookies_file=cookie_file,
            minimum_wait_page_load_time=1,
            viewport_expansion=0,
        ),
    )

    return browser, context


async def _set_items_in_browser_local_storage(
    context: BrowserContext, local_storage: str
) -> None:
    load_script = (
        """
  (storage => {
      Object.keys(storage).forEach(key => {
          localStorage.setItem(key, storage[key]);
      });
      return localStorage.length;
  })(%s)
  """.strip()
        % json.dumps(local_storage)
    )
    await context.execute_javascript(load_script)
