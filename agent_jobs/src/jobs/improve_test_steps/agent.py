from typing import Any
from textwrap import dedent
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI


from src.common.dto import Test, TestStatus
from src.config import Config

from src.agents.tools import TOOLS, get_prompt_list_of_tools
from src.agents.base_agent import run_agent
from src.agents.utils import format_secrets


from .dto import ImproveTestStepsResult


IMPROVE_STEPS_PROMPT = dedent("""You are an AI assistant acting as a test automation engineer. Your task is to rewrite the test steps below to be much more detailed, clear, precise and structured.

To do this, first explore the entire page and attempt to go through the test flow. Your goal is to fully understand every individual action that must be taken in order to complete the test.
This includes identifying each required element and interaction, even if they aren't explicitly mentioned in the original steps.

You are allowed to perform parts of the test if necessary to reveal or locate elements that are otherwise hidden or dependent on user interaction.
Take as much time and a many steps as you need to fully understand and cover the test flow. It's very important that you cover absolutely everything.

Once you've explored the full flow and understand exactly what's needed, rewrite the test steps to reflect that level of detail. The updated steps should make it easy for someone else to follow and execute the test with no ambiguity.

<test_info>
Test Name: {test.name}

Description: {test.description}

Preconditions (if any):
{test.preconditions}

Steps:
{test.steps}

Assertions: {test.assertions}
</test_info>

While writing the test steps, you can reference the following tools to be used:
{tools}

For your final output, do not write anything else than the test steps, nothing before, nothing after, no additional notes, only the test steps.
Do not include example values in the test steps you output, however you can reference tools if needed.
Do not include the initial link navigation in the test steps you output, it's automatically performed.
If the initial test step includes a mistake, fix it.

Final output example:
1. First step to do
    a. Sub test to do
2 Second step to do
...
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


async def run(
    config: Config,
    task_id: str,
    test: Test,
    secrets: list[dict[str, Any]],
    auth_session: dict[str, dict[str, str]],
) -> ImproveTestStepsResult:
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
        sensitive_data=format_secrets(secrets),
        auth_session=auth_session,
        tools=TOOLS,
    )

    inital_result = history.final_result()

    if inital_result is None:
        return ImproveTestStepsResult(
            status=TestStatus.FAILED,
            results="No result from agent",
        )

    message = HumanMessage(
        content=[
            {"type": "text", "text": FORMAT_PROMPT.format(test_steps=inital_result)},
        ],
    )

    llm_client = ChatOpenAI(
        model="gpt-4.1-mini",
        temperature=0.0,
        timeout=120,
    )

    final_result: str = (await llm_client.ainvoke([message])).content.strip()  # type: ignore

    if final_result is None:
        return ImproveTestStepsResult(
            status=TestStatus.FAILED,
            results="No result from agent",
        )

    return ImproveTestStepsResult(
        status=TestStatus.PASSED,
        results=final_result,
    )
