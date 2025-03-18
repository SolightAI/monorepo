import os
import json
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
from run_tests.dto import Test
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from fastapi import APIRouter, BackgroundTasks, HTTPException
import logging
from utils.crypto import crypto_service


# TODO: use Preconditions to let the agent know what fixture to run before running the test
PROMPT = """
You are an AI assistant acting as a test automation engineer. Your task is to execute the provided test cases and verify the results.

First, review the following information:

Test Name: {test.name}

Description: {test.description}

Preconditions (if any):
{test.preconditions}

Steps:
{test.steps}

Expected Results:
{test.expected_results}

Assertions: {test.assertions}

Additional instructions:
- If a precondition is not met, stop the test, report the error, and include "[AN ERROR OCCURED]" in our final response.
- After each step, always verify that you successfully completed the step.

Now, run the test.
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


router = APIRouter(prefix="/run-test")
logger = getLogger(__name__)
task_ids = {}


async def _run_test(
    test: Test,
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

    await context.navigate_to(test.url)  # allowing us to load the localStorage

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
        task=PROMPT.format(test=test),
        llm=LLM_CLIENT,
        initial_actions=[{'go_to_url': {'url': test.url}}, {'go_to_url': {'url': test.url}}],
        browser_context=context,
        # generate_gif=gif_output_path,  # deactivated cause it leads to thread blocking
    )

    try:
        history = await agent.run(max_steps=30)
    finally:
        await context.close()
        await browser.close()

    result = history.final_result()  # type: ignore

    from browser_use.agent.gif import create_history_gif  # NOTE: importing after agent.run() to avoid thread blocking
    if gif_output_path:
        create_history_gif(task=PROMPT.format(test=test), history=history, output_path=gif_output_path, show_goals=False, show_task=False, show_logo=False)

    logger.info(f"{history.has_errors()=} {history.is_done()=} {result is None=} {history.is_successful()=}")
    if history.has_errors() or not history.is_done() or result is None or not history.is_successful():
        raise Exception("Failed to run test")

    if result is None:
        logger.error("Couldn't run test for %s", test.name)
        logger.debug("History of the agent when running test for %s: %s", test.name, history.action_results())
        raise Exception("Failed to run test, result is None")

    # result = _parse_test_cases(result)

    # return [_test | {'url': test.url} for _test in result]
    return result


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
async def background_run_test(
    task_id: str,
    test: Test,
    secrets: dict[str, dict[str, str]],
    gif_output_path: str | bool = False,
) -> list[Test]:

    logger.info(f"Generating cookies for {test.url}")

    # TODO: we should not generate cookies for each test, but only once per product
    try:
        auth_session = await generate_auth_session(
            url=test.url,  # NOTE: we're using test.url instead of product.url, we might want to make sure it's ok
            secrets=secrets,
        )
    except Exception as e:
        logger.error(f"Error in background task {task_id}: {e}")
        raise e

    logger.info(f"Generated cookies for {test.url}")

    with NamedTemporaryFile(delete=True, suffix='.json', mode='w+') as f:

        if auth_session['cookies'] is not None:
            json.dump(auth_session['cookies'], f)
            f.flush()
            f.seek(0)

        logger.info(f"Running test {test.name} for {test.url}")
        result = await _run_test(
            test=test,
            cookies_file=f.name if auth_session.get('cookies') is not None else None,
            localStorage=auth_session.get('localStorage'),
            gif_output_path=gif_output_path if not gif_output_path else os.path.join(gif_output_path, f"{test.name}.gif"),
        )

        logger.info(f"Ran tests for {test.url}")

    task_ids[task_id] = {"status": "completed", "results": result}

    return result


@router.post("/run-test")
async def run_test(
    test: Test,
    background_task: BackgroundTasks,
    secrets: Optional[dict[str, dict[str, str]]] = None,
    encrypted_secrets: Optional[dict[str, dict[str, str]]] = None,
) -> str:

    task_id = str(uuid4())

    # Decrypt encrypted secrets if provided
    if encrypted_secrets:
        try:
            # Decrypt the secrets
            secrets = crypto_service.decrypt_secrets(encrypted_secrets)
            logging.info("Successfully decrypted secrets for task")
        except Exception as e:
            logging.error(f"Failed to decrypt secrets: {str(e)}")
            raise HTTPException(status_code=400, detail="Failed to decrypt secrets")

    # Ensure we have secrets
    if not secrets:
        secrets = {}

    background_task.add_task(
        background_run_test,
        task_id=task_id,
        test=test,
        secrets=secrets,
        gif_output_path="/tmp/",
    )

    task_ids[task_id] = {"status": "pending", "results": None}

    return task_id


@router.get("/status/{task_id}")
async def get_test_run_status(
    task_id: str,
) -> dict[str, Any]:

    if task_id not in task_ids:
        raise HTTPException(status_code=404, detail="Task not found")

    return task_ids[task_id]
