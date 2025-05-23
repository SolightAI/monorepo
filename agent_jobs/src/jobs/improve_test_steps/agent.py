from typing import Any
from textwrap import dedent
from lmnr import Laminar, observe

from src.common.dto import Test, TestStatus
from src.config import Config

from src.agents.tools import TOOLS, get_prompt_list_of_tools
from src.agents.base_agent import run_agent
from src.agents.utils import format_secrets


from .dto import ImproveTestStepsResult


IMPROVE_STEPS_PROMPT = dedent("""You are an AI assistant acting as a test automation engineer. Your task is to rewrite the provided test steps to follow the desired rules.

To do this, first explore the entire page and attempt to go through the test flow. Your goal is to fully understand every individual action that must be taken in order to complete the test.
This includes identifying each required element and interaction, even if they aren't explicitly mentioned in the original steps.

You are allowed to perform parts of the test, explore the page, and do any action you need to reveal or locate elements that are otherwise hidden or dependent on user interaction.
Take as much time and a many steps as you need to fully understand and cover the test flow. It's very important that you cover absolutely everything.

Once you've explored the full flow and understand exactly what's needed, rewrite the test steps to respect the expected format. The updated steps should make it easy for someone else to follow and execute the test with no ambiguity.
The goals of test steps are to describe every single actions that the agent needs to take in order to do the provided test. Every single action must be included, mentioned and described.

The steps should only contain actions the agent must perform, not assertions, no observations, no notes, no validations, only actions to do in order to complete the test.
Actions must be listed in the exact order they should be performed, from first to last. If two actions can be performed simultaneously, order them based on their position on the page, top to bottom.

Do not include example values in the test steps you output, nor initial link navigation.

You can reference tools to be used in the test steps. The following tools are available:
{tools}

The steps should be written in the following format:
1. First action to do
2. A big action to do
    a. A sub-action to do in order to achieve the bigger action
    b. ...
3. ...

To give you more context and a better understanding of the test, here is some additional information about the test:

<test_info>
Test Name: {test.name}

Description: {test.description}

Preconditions (if any):
{test.preconditions}

Assertions: {test.assertions}
</test_info>

Knowing your task, and context about the test, here are the steps that needs to be improved:

<test_steps>
{test.steps}
</test_steps>

Help yourself from the provided draft to make sure you don't forget any actions to mention in your final result.

""")


FORMAT_PROMPT = dedent("""You're given some test steps, your goal is to make sure the output is correctly formated.
The output should only contain a suite of steps and sub-steps to do, no introduction, no conclusion, no additional notes, only the steps.

Given the following test steps, output step in the correct format. If they are already correctly formated, output it as it is, otherwise, format it.

<test_steps>
{test_steps}
</test_steps>

Write the results without any preliminary sentence, no intro, no outro, just the result.
Do not modify the content of the test steps, only the format and only if needed.

Example of final output:
1. First step to do
    a. Sub test to do
2 Second step to do
...
""")


@observe()
async def run(
    config: Config,
    task_id: str,
    test: Test,
    secrets: list[dict[str, Any]],
    auth_session: dict[str, dict[str, str]],
) -> ImproveTestStepsResult:
    Laminar.set_session(session_id=task_id)
    Laminar.set_metadata({"task_id": task_id, "job": "improve_test_steps.run"})

    prompt = IMPROVE_STEPS_PROMPT.format(
        test=test,
        tools=get_prompt_list_of_tools(TOOLS),
    )

    _, history, *__ = await run_agent(
        config=config,
        identifier=None,
        task_id=task_id,
        url=test.url,
        prompt=prompt,
        sensitive_data=format_secrets(secrets) if secrets is not None else dict(),
        auth_session=auth_session,
        tools=TOOLS,
    )

    final_result = history.final_result()

    if final_result is None:
        return ImproveTestStepsResult(
            status=TestStatus.FAILED,
            results="No result from agent",
        )

    return ImproveTestStepsResult(
        status=TestStatus.PASSED,
        results=final_result,
    )
