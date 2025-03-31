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
from utils.dto import Test
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from fastapi import APIRouter, BackgroundTasks, HTTPException
import logging
from utils.crypto import crypto_service
from utils.history_validator import validate_agent_history
from run_tests.tracing import initialize, extend_agent_history


TEST_SUCCESS_MESSAGE = "[TEST SUCCESSFUL]"  # when the test is successful
TEST_FAILED_MESSAGE = "[TEST FAILED]"  # when the test is failed
AN_ERROR_OCCURED_MESSAGE = "[AN ERROR OCCURED]"  # when an error occurs
PRECONDITION_NOT_MET_MESSAGE = "[PRECONDITION NOT MET]"  # when the precondition is not met
UNEXISTING_FEATURE_MESSAGE = "[UNEXISTING FEATURE]"  # when the agent is unable to locaate the feature on the page
AGENT_LIMITATION_MESSAGE = "[AGENT LIMITATION]"  # when the test cannot be completed due to agent limitations


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
- If an error occurs, prepend your final output by "{an_error_occured_message}", and then explain the error.
- If a precondition is not met, prepend your final output by "{precondition_not_met_message}", and then explain why.
- If the test is successful, prepend your final output by "{test_successful_message}", and then explain why.
- If you are unable to run the test or if the test failed due to the fact that you don't have the ability to do an action, stop what you are doing and prepend your final output by "{agent_limitation_message}", and then explain what happened.
- Before starting the test, check if you have the ability to perform the actions required to run the test. If not, refer to the previous instructions.
- If you are unable to locate the feature on the page and you think it's because it doesn't exist, stop what you are doing and prepend your final output by "{unexisting_feature_message}", and then explain what happened.
- If one of the step fails, for a reason other than the ones specified above, try it 2 times, and if it still fails, stop what you are doing and prepend your final output by "{test_failed_message}", and then explain what failed.
- If one of the assertions failed, for a reason other than the ones specified above, stop what you are doing and prepend your final output by "{test_failed_message}", and then explain what failed.
- After each step, check if the step was successful. If yes, continue to the next step. If not, refer to the previous instructions.

Be aware that you do NOT have the ability to:
- Upload files and Download files
- Upload images and Download images
- Upload videos and Download videos
- See the OS file selector, or the OS file uploader or OS file dialogs
- Leave outside the website to perform any search
- Change the window size, or the viewport size

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
) -> dict[str, Any]:

    # Initialize JavaScript logging
    initialize()

    browser = Browser(
        config=BrowserConfig(
            headless=os.getenv("HEADLESS", "true").lower() == "true",
        )
    )

    context = BrowserContext(browser=browser, config=BrowserContextConfig(
        cookies_file=cookies_file,
        minimum_wait_page_load_time=1,
        viewport_expansion=0,
        browser_window_size={'width': 1920, 'height': 1080},
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
        """.strip() % json.dumps(localStorage)
        await context.execute_javascript(load_script)

    if gif_output_path:
        os.makedirs(os.path.dirname(gif_output_path), exist_ok=True)

    # Extend agent history with JS logging capabilities
    extend_agent_history()

    # NOTE: we do not provide a controller as models tend to provide better results when not constrained by a controller output model
    agent = Agent(
        task=PROMPT.format(
            test=test,
            test_failed_message=TEST_FAILED_MESSAGE,
            test_successful_message=TEST_SUCCESS_MESSAGE,
            an_error_occured_message=AN_ERROR_OCCURED_MESSAGE,
            precondition_not_met_message=PRECONDITION_NOT_MET_MESSAGE,
            unexisting_feature_message=UNEXISTING_FEATURE_MESSAGE,
            agent_limitation_message=AGENT_LIMITATION_MESSAGE,
        ),
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

    result = await validate_agent_history(
        history=history,
        task_name=f"run test {test.name}",
    )

    from browser_use.agent.gif import create_history_gif  # NOTE: importing after agent.run() to avoid thread blocking
    if gif_output_path:
        create_history_gif(task=PROMPT, history=history, output_path=gif_output_path, show_goals=False, show_task=False, show_logo=False)

    logger.info(f"{history.has_errors()=} {history.is_done()=} {result is None=} {history.is_successful()=}")

    base_ouput = {
        "agent_thoughts": history.model_thoughts(),
        "agent_actions": history.model_actions(),
    }

    if result is None:
        logger.error(f"Couldn't run test for {test.name}: {history.final_result()}")
        return base_ouput | {
            "status": "error",
            "results": None,
            "tracing": history.get_logs(),
            "error": "Failed to run test, result is None",
            "traceback": "",
        }

    if AGENT_LIMITATION_MESSAGE in result:
        logger.info(f"Agent limitation encountered: {result}")
        return base_ouput | {
            "status": "agent_limitation",
            "results": result.replace(AGENT_LIMITATION_MESSAGE, "").strip(),
            "tracing": history.get_logs(),
            "error": "",
            "traceback": "",
        }

    if UNEXISTING_FEATURE_MESSAGE in result:
        logger.info(f"Feature not found: {result}")
        return base_ouput | {
            "status": "unexisting_feature",
            "results": result.replace(UNEXISTING_FEATURE_MESSAGE, "").strip(),
            "tracing": history.get_logs(),
            "error": "",
            "traceback": "",
        }

    if AN_ERROR_OCCURED_MESSAGE in result:
        logger.error(f"An error occurred during the test: {result}")
        return base_ouput | {
            "status": "error",
            "results": result.replace(AN_ERROR_OCCURED_MESSAGE, "").strip(),
            "tracing": history.get_logs(),
            "error": "An error occurred during the test.",
            "traceback": "",
        }

    if PRECONDITION_NOT_MET_MESSAGE in result:
        logger.info(f"Precondition not met: {result}")
        return base_ouput | {
            "status": "error",
            "results": result.replace(PRECONDITION_NOT_MET_MESSAGE, "").strip(),
            "tracing": history.get_logs(),
            "error": "Precondition not met.",
            "traceback": "",
        }

    if TEST_FAILED_MESSAGE in result:
        logger.info(f"Test failed: {result}")
        return base_ouput | {
            "status": "failed",
            "results": result.replace(TEST_FAILED_MESSAGE, "").strip(),
            "tracing": history.get_logs(),
            "error": "",
            "traceback": "",
        }

    if TEST_SUCCESS_MESSAGE in result:
        logger.info(f"Test successful: {result}")
        return base_ouput | {
            "status": "completed",
            "results": result.replace(TEST_SUCCESS_MESSAGE, "").strip(),
            "tracing": history.get_logs(),
            "error": "",
            "traceback": "",
        }

    logger.error(f"Unknown status of test run: {result}")
    return base_ouput | {
        "status": "error",
        "results": None,
        "tracing": history.get_logs(),
        "error": "Unknown status of test run.",
        "traceback": "",
    }


def handle_background_task_errors(func):
    """
    Decorator for background task functions that handles errors and updates task_ids.

    Args:
        func: The async function to wrap. The first argument must be task_id.

    Returns:
        An async function wrapped with error handling that updates task_ids.
    """
    @functools.wraps(func)
    async def wrapper(task_id: str, *args, **kwargs):  # type: ignore
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
) -> dict[str, Any]:

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

    task_ids[task_id] = result

    return result


@router.post("/run-test")
async def run_test(
    test: Test,
    background_task: BackgroundTasks,
    encrypted_secrets: Optional[dict[str, dict[str, str]]] = None,
) -> str:

    task_id = str(uuid4())

    # Decrypt encrypted secrets if provided
    secrets = {}
    if encrypted_secrets:
        try:
            # Decrypt the secrets
            secrets = crypto_service.decrypt_secrets(encrypted_secrets)
            logging.info("Successfully decrypted secrets for task")
        except Exception as e:
            logging.error(f"Failed to decrypt secrets: {str(e)}")
            raise HTTPException(status_code=400, detail="Failed to decrypt secrets")

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
