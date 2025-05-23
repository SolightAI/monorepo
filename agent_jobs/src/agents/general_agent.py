import logging

from typing import Any

from src.common.dto import Test, TestStatus
from src.config import Config

from .healthchecks import is_agent_able_to_run_test, run_additional_healthcheck
from .base_agent import BaseAgentResult, run_agent
from .tools import TOOLS, get_prompt_list_of_tools
from .utils import format_secrets, get_agent_thoughts, get_agent_actions
from .shared_limitations import SHARED_AGENT_LIMITATIONS
from ._check_final_test_result import check_final_test_result


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

Now, run the test.
""".strip()


logger = logging.getLogger(__name__)


class GeneralAgentResult(BaseAgentResult):
    pass


async def general_agent(
    config: Config,
    identifier: str,
    task_id: str,
    test: Test,
    secrets: list[dict[str, Any]],
    auth_session: dict[str, dict[str, str]],
    run_without_cache: bool = False,
) -> GeneralAgentResult:
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

    is_able, explanation = await is_agent_able_to_run_test(
        task_id=task_id,
        test=test,
        agent_tools=TOOLS,
        secrets_names=list(format_secrets(secrets).keys()),
    )

    if is_able is False:
        return GeneralAgentResult(
            status=TestStatus.AGENT_LIMITATION,
            results=explanation,
        )

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
        auth_session=auth_session,
        tools=TOOLS,
    )

    logger.info(f"[{task_id}] General agent finished running test.")

    additional_healthchecks_results = await run_additional_healthcheck(
        config=config,
        identifier=identifier,
        task_id=task_id,
        test=test,
        existing_session=session_data,
    )

    logger.info(f"[{task_id}] General agent finished running additional healthchecks.")

    status, explanation = await check_final_test_result(
        task_id=task_id,
        test=test,
        agent_output=history.final_result() or "None",
        screenshot_base64=history.screenshots()[-1]
        if len(history.screenshots()) > 0
        else None,
        healthcheck_results=additional_healthchecks_results,
    )

    logger.info(f"[{task_id}] General agent finished checking final test result.")

    return GeneralAgentResult(
        agent_thoughts=get_agent_thoughts(history=history),
        agent_actions=get_agent_actions(history=history),
        evidence=evidences,
        status=status,
        results=explanation,
        # tracing=history.get_logs(),
        error=explanation if status != TestStatus.PASSED else "",
        traceback="",
        is_from_cache=is_from_cache,
    )
