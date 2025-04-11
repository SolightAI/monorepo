import os
import json

from typing import Any
from pydantic import SecretStr
from logging import getLogger
from tempfile import NamedTemporaryFile
from langchain_openai import AzureChatOpenAI
from browser_use import Agent, Browser, BrowserConfig
from browser_use.agent.service import logger as agent_logger
from utils.dto import Test
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from run_tests.tracing import initialize, extend_agent_history
from utils.s3_utils import upload_gif_to_s3
from utils.constants import AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, TestStatus


TEST_SUCCESS_MESSAGE = "[TEST SUCCESSFUL]"  # when the test is successful
TEST_FAILED_MESSAGE = "[TEST FAILED]"  # when the test is failed
AN_ERROR_OCCURED_MESSAGE = "[AN ERROR OCCURRED]"  # when an error occurs
PRECONDITION_NOT_MET_MESSAGE = "[PRECONDITION NOT MET]"  # when the precondition is not met
UNEXISTING_FEATURE_MESSAGE = "[UNEXISTING FEATURE]"  # when the agent is unable to locaate the feature on the page
AGENT_LIMITATION_MESSAGE = "[AGENT LIMITATION]"  # when the test cannot be completed due to agent limitations


PROMPT = """
You are an AI assistant acting as a test automation engineer. Your task is to execute the provided test cases and verify the results.

First, review the following information:

Test Name: {test.name}

Description: {test.description}

Preconditions (if any):
{test.preconditions}

Steps:
{test.steps}

Assertions: {test.assertions}

Additional instructions:
- If an error occurs, prepend your final output by "{an_error_occured_message}", and then explain the error.
- If a precondition is not met, prepend your final output by "{precondition_not_met_message}", and then explain why.
- If the test is successful, prepend your final output by "{test_successful_message}", and then explain why.
- If you are unable to run the test or if the test failed due to the fact that you don't have the ability to do an action, stop what you are doing and prepend your final output by "{agent_limitation_message}", and then explain what happened.
- Before starting the test, check if you have the ability to perform the actions required to run the test. If not, refer to the previous instructions by raising the appropriate message.
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


LLM_CLIENT = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_key=SecretStr(AZURE_OPENAI_KEY),
    temperature=0.0,
)


logger = getLogger(__name__)


def get_parameters_for_general_test_runner(
    task_id: str,
    test: Test,
    secrets: dict[str, dict[str, str]],
) -> dict[str, Any]:
    return {
        "task_id": task_id,
        "test": test,
        "secrets": secrets,
    }


async def general_test_runner_agent(
    task_id: str,
    test: Test,
    secrets: dict[str, dict[str, str]],
) -> dict[str, Any]:
    """
    General test runner that can be used for most of the tests.
    Not as good as the specific test runner, but can be used for most of the tests.

    Args:
        task_id: The ID of the task.
        test: The test to run.
        cookies_file: The cookies file to use.
        localStorage: The localStorage to use.

    Returns:
        A dictionary containing the status of the test, the results, and the tracing.
    """

    localStorage = secrets.get("localStorage")
    with NamedTemporaryFile(delete=False, suffix='.json', mode='w+') as f:
        if localStorage is not None:
            json.dump(localStorage, f)
            f.flush()
            f.seek(0)

    cookies_file = f.name

    agent_logger.name = f"{agent_logger.name}-{task_id}"

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

    logger.info(f"[{task_id}] Navigating to {test.url}")
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

    # Extend agent history with JS logging capabilities
    extend_agent_history()

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
        enable_memory=False,
    )

    try:
        history = await agent.run(max_steps=30)
    finally:
        await context.close()
        await browser.close()

    result = history.final_result()

    os.remove(cookies_file)

    base_ouput = {
        "agent_thoughts": history.model_thoughts(),
        "agent_actions": history.model_actions(),
    }

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
            task_name=test.name,
            additional_params=test.model_dump()
        )
        if s3_url:
            logger.info(f"[{task_id}] Features GIF uploaded to S3: {s3_url}")

    if result is None:
        logger.error(f"[{task_id}] Couldn't run test for {test.name}: {history.final_result()}")
        return base_ouput | {
            "status": TestStatus.ERROR.value,
            "results": None,
            "tracing": history.get_logs(),
            "error": "Failed to run test, result is None",
            "traceback": "",
        }

    if AGENT_LIMITATION_MESSAGE in result:
        logger.info(f"[{task_id}] Agent limitation encountered: {result}")
        return base_ouput | {
            "status": TestStatus.AGENT_LIMTATION.value,
            "results": result.replace(AGENT_LIMITATION_MESSAGE, "").strip(),
            "tracing": history.get_logs(),
            "error": "",
            "traceback": "",
        }

    if UNEXISTING_FEATURE_MESSAGE in result:
        logger.info(f"[{task_id}] Feature not found: {result}")
        return base_ouput | {
            "status": TestStatus.UNEXISTING_FEATURE.value,
            "results": result.replace(UNEXISTING_FEATURE_MESSAGE, "").strip(),
            "tracing": history.get_logs(),
            "error": "",
            "traceback": "",
        }

    if AN_ERROR_OCCURED_MESSAGE in result:
        logger.error(f"[{task_id}] An error occurred during the test: {result}")
        return base_ouput | {
            "status": TestStatus.ERROR.value,
            "results": result.replace(AN_ERROR_OCCURED_MESSAGE, "").strip(),
            "tracing": history.get_logs(),
            "error": "An error occurred during the test.",
            "traceback": "",
        }

    if PRECONDITION_NOT_MET_MESSAGE in result:
        logger.info(f"[{task_id}] Precondition not met: {result}")
        return base_ouput | {
            "status": TestStatus.ERROR.value,
            "results": result.replace(PRECONDITION_NOT_MET_MESSAGE, "").strip(),
            "tracing": history.get_logs(),
            "error": "Precondition not met.",
            "traceback": "",
        }

    if TEST_FAILED_MESSAGE in result:
        logger.info(f"[{task_id}] Test failed: {result}")
        return base_ouput | {
            "status": TestStatus.FAILED.value,
            "results": result.replace(TEST_FAILED_MESSAGE, "").strip(),
            "tracing": history.get_logs(),
            "error": "",
            "traceback": "",
        }

    if TEST_SUCCESS_MESSAGE in result:
        logger.info(f"[{task_id}] Test successful: {result}")
        return base_ouput | {
            "status": TestStatus.COMPLETED.value,
            "results": result.replace(TEST_SUCCESS_MESSAGE, "").strip(),
            "tracing": history.get_logs(),
            "error": "",
            "traceback": "",
        }

    logger.error(f"[{task_id}] Unknown status of test run: {result}")
    return base_ouput | {
        "status": TestStatus.ERROR.value,
        "results": None,
        "tracing": history.get_logs(),
        "error": "Unknown status of test run.",
        "traceback": "",
    }
