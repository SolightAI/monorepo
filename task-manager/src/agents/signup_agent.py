from typing import Any
from utils.dto import Test
from logging import getLogger
from utils.dto import TestStatus
from fixtures.tools import TOOLS, get_prompt_list_of_tools
from agents._base_agent import (
    run_agent,
    get_agent_thoughts,
    get_agent_actions,
    is_agent_able_to_run_test,
    check_final_test_result,
    run_additional_healthcheck,
    format_secrets,
    SHARED_AGENT_LIMITATIONS,
)


AGENT_LIMITATIONS = [
    "The agent cannot signup using a social media account (Google, Facebook, Twitter, etc.)",
]

PROMPT = """
You are an AI assistant acting as a Quality Assurance Engineer. Your task is to test the signup feature of an application by following the instructions provided and verifying the results.

First, review the following information describing the test you need to run:

Test Name: {test.name}

Description: {test.description}

Preconditions (if any):
{test.preconditions}

Steps:
{test.steps}

Assertions: {test.assertions}

If you need help locating the signup feature, follow these steps:
- Look if the test includes instructions to locate the signup form.
- Look for a “Sign In / Sign Up” button, typically in the top-right corner of the page.
- If you're already on the login page, click the “Sign Up” link or button.
- If you're on another page, first find the “Sign In / Sign Up” control, then choose “Sign Up.”
- The signup link often sits inside or immediately beside the login form.
- If you complete the signup fields, carefully read any error messages before proceeding.
- If you encounter a MFA google verification, select "Confirm your recovery phone number" and enter the phone number provided in the secrets.

Be aware that you have the ability to:
{tools}

Be aware that you do NOT have the ability to:
{agent_limitations}

Now, run the test.
""".strip()


logger = getLogger(__name__)


def get_parameters_for_signup_agent(
    task_id: str,
    test: Test,
    secrets: dict[str, dict[str, str]],
    auth_session: dict[str, dict[str, str]],
) -> dict[str, Any]:
    return {
        "task_id": task_id,
        "test": test,
        "secrets": secrets,
        "auth_session": auth_session,
    }


async def signup_agent(
    task_id: str,
    test: Test,
    secrets: list[dict[str, Any]],
    auth_session: dict[str, dict[str, str]],  # unused
) -> dict[str, Any]:
    """
    Agent used to test the signup feature of a website.

    Args:
        task_id: The ID of the task.
        test: The test to run.
        secrets: The secrets to use.
        auth_session: The auth session to use (unused)

    Returns:
        A dictionary containing the status of the test, the results, and the tracing.
    """

    del auth_session  # making sure we don't use the auth session

    is_able, explanation = is_agent_able_to_run_test(
        task_id=task_id,
        test=test,
        agent_tools=TOOLS,
        agent_limitations=AGENT_LIMITATIONS,
    )

    if is_able is False:
        return {
            "status": TestStatus.AGENT_LIMITATION.value,
            "results": explanation,
        }

    session_data, history, evidences = await run_agent(
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
        task_id=task_id,
        test=test,
        existing_session=session_data,
    )

    status, explanation = check_final_test_result(
        task_id=task_id,
        test=test,
        agent_output=history.final_result(),
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
    }
