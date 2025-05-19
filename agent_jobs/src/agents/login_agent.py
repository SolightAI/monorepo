import logging

from typing import Any
from lmnr import observe

from src.common.dto import Test, TestStatus
from src.config import Config

from .healthchecks import is_agent_able_to_run_test, run_additional_healthcheck
from .base_agent import run_agent
from .tools import TOOLS, get_prompt_list_of_tools
from .utils import format_secrets, get_agent_thoughts, get_agent_actions
from .shared_limitations import SHARED_AGENT_LIMITATIONS
from ._check_final_test_result import check_final_test_result

AGENT_LIMITATIONS = [
    "The agent cannot login using a social media account outside of Google (GitHub, Facebook, Twitter, etc.)",
    'The agent cannot use the "Instant Login" feature (that sends a link to the user\'s email to login)',
]

PROMPT = """
You are an AI assistant acting as a Quality Assurance Engineer. Your task is to test the login feature of an application by following the instructions provided and verifying the results.

First, review the following information describing the test you need to run:

Test Name: {test.name}

Description: {test.description}

Preconditions (if any):
{test.preconditions}

Steps:
{test.steps}

Assertions: {test.assertions}

Additional instructions:
- When using the login method, take the time to read the form's error messages if any.

Be aware that you have the ability to:
{tools}

Be aware that you do NOT have the ability to:
{agent_limitations}

Now, run the test.
""".strip()


logger = logging.getLogger(__name__)


@observe()
async def login_agent(
    config: Config,
    identifier: str,
    task_id: str,
    test: Test,
    secrets: list[dict[str, Any]],
    auth_session: dict[str, dict[str, str]],  # unused
    run_without_cache: bool = False,
) -> dict[str, Any]:
    """
    Agent specialized into testing the login feature of a website.

    Args:
        task_id: The ID of the task.
        test: The test to run.
        secrets: The secrets to use.
        auth_session: The authentication session to use. (unused)

    Returns:
        A dictionary containing the status of the test, the results, and the tracing.
    """

    del auth_session

    is_able, explanation = await is_agent_able_to_run_test(
        task_id=task_id,
        test=test,
        agent_tools=TOOLS,
        agent_limitations=AGENT_LIMITATIONS,
        secrets_names=list(format_secrets(secrets).keys()),
    )

    if is_able is False:
        return {
            "status": TestStatus.AGENT_LIMITATION.value,
            "results": explanation,
        }

    session_data, history, evidences, is_from_cache = await run_agent(
        config=config,
        identifier=identifier,
        run_without_cache=run_without_cache,
        task_id=task_id,
        url=test.url,
        prompt=PROMPT.format(
            test=test,
            tools=get_prompt_list_of_tools(TOOLS),
            agent_limitations="\n".join(SHARED_AGENT_LIMITATIONS),
        ),
        sensitive_data=format_secrets(secrets),
        auth_session=None,
        tools=TOOLS,
    )

    additional_healthchecks_results = await run_additional_healthcheck(
        config=config,
        identifier=identifier,
        task_id=task_id,
        test=test,
        existing_session=session_data,
    )

    status, explanation = await check_final_test_result(
        task_id=task_id,
        test=test,
        agent_output=history.final_result() or "",  # TODO(TomChv): Can this happens?
        screenshot_base64=history.screenshots()[-1]
        if len(history.screenshots()) > 0
        else None,
        healthcheck_results=additional_healthchecks_results,
    )

    return {
        "agent_thoughts": get_agent_thoughts(history=history),
        "agent_actions": get_agent_actions(history=history),
        "evidence": evidences,
        "status": status.value,
        "results": explanation,
        # "tracing": history.get_logs(),
        "error": explanation if status != TestStatus.PASSED else "",
        "traceback": "",
        "is_from_cache": is_from_cache,
    }
