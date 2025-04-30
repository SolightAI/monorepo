from typing import Any
from logging import getLogger
from utils.dto import Test
from utils.dto import TestStatus
from agents._base_agent import (
    run_agent,
    get_agent_thoughts,
    get_agent_actions,
    is_agent_able_to_run_test,
    check_final_test_result,
    run_additional_healthcheck,
    get_prompt_list_of_tools,
    format_secrets,
    SHARED_AGENT_LIMITATIONS,
)
from fixtures.tools import TOOLS


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

Be aware that you have the ability to:
{tools}

Be aware that you do NOT have the ability to:
{agent_limitations}

Additional information:
- If you failed a step, you can retry it.
- Don't give up unless you're sure the test is not going to pass.
- Always double check your actions and the steps you're taking.

Now, run the test.
""".strip()


logger = getLogger(__name__)


def get_parameters_for_general_agent(
    task_id: str,
    test: Test,
    secrets: list[dict[str, Any]],
    auth_session: dict[str, dict[str, str]],
) -> dict[str, Any]:
    return {
        "task_id": task_id,
        "test": test,
        "secrets": secrets,
        "auth_session": auth_session,
    }


async def general_agent(
    task_id: str,
    test: Test,
    secrets: list[dict[str, Any]],
    auth_session: dict[str, dict[str, str]],
) -> dict[str, Any]:
    """
    General test runner that should be used for most of the tests.

    Args:
        task_id: The ID of the task.
        test: The test to run.
        secrets: The secrets to use.
        auth_session: The auth session to use.

    Returns:
        A dictionary containing the status of the test, the results, and the tracing.
    """

    is_able, explanation = is_agent_able_to_run_test(
        task_id=task_id,
        test=test,
        agent_tools=TOOLS,
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
        auth_session=auth_session,
        tools=TOOLS,
    )

    logger.info(f"[{task_id}] General agent finished running test.")

    additional_healthchecks_results = await run_additional_healthcheck(
        task_id=task_id,
        test=test,
        existing_session=session_data,
    )

    logger.info(f"[{task_id}] General agent finished running additional healthchecks.")

    status, explanation = check_final_test_result(
        task_id=task_id,
        test=test,
        agent_output=history.final_result(),
        healthcheck_results=additional_healthchecks_results,
    )

    logger.info(f"[{task_id}] General agent finished checking final test result.")

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
