from utils.dto import TestStatus
from textwrap import dedent
from utils.dto import Test
from typing import Any, Optional
from logging import getLogger
from crypto.crypto import crypto_service
from utils.dto import Product
from fixtures.tools import TOOLS, get_prompt_list_of_tools
from agents._base_agent import run_agent, format_secrets
from fixtures.authentification.get_auth_session import get_auth_session
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from utils.constants import SEED


logger = getLogger(__name__)


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


LLM_FORMAT = ChatOpenAI(
    model="gpt-4.1-mini",
    temperature=0.0,
    timeout=120,
    seed=SEED,
)


async def improve_test_steps(
    ctx: dict[Any, Any],
    product: dict[str, Any],  # used to get the login url
    feature: dict[str, Any],
    test: dict[str, Any],
    secrets: Optional[list[dict[str, Any]]] = None,
) -> dict[str, Any]:

    product_obj: Product = Product(**product)
    test_obj: Test = Test(**test)
    decrypted_secrets: list[dict[str, Any]] = list()

    if secrets:
        decrypted_secrets = crypto_service.decrypt_secrets(secrets)

    auth_session = dict()
    if test_obj.access_conditions and test_obj.access_conditions.get("must_be_logged_in") is True:
        auth_session = await get_auth_session(
            identifier=None,
            task_id=ctx['job_id'],
            url=product_obj.url,
            secrets=decrypted_secrets,
        )

    logger.info(f"[{ctx['job_id']}] Running test {test_obj.name} for {test_obj.url}")

    prompt = IMPROVE_STEPS_PROMPT.format(
        test=test_obj,
        tools=get_prompt_list_of_tools(TOOLS),
    )

    _, history, *__ = await run_agent(
        identifier=None,
        task_id=ctx['job_id'],
        url=test_obj.url,
        prompt=prompt,
        sensitive_data=format_secrets(secrets),
        auth_session=auth_session,
        tools=TOOLS,
    )

    inital_result = history.final_result()

    if inital_result is None:
        return {
            "status": TestStatus.FAILED.value,
            "results": "No result from agent",
        }

    message = HumanMessage(
        content=[
            {"type": "text", "text": FORMAT_PROMPT.format(test_steps=inital_result)},
        ],
    )

    final_result: str = (await LLM_FORMAT.ainvoke([message])).content.strip()  # type: ignore

    if final_result is None:
        return {
            "status": TestStatus.FAILED.value,
            "results": "No result from agent",
        }

    return {
        "status": TestStatus.PASSED.value,
        "results": final_result,
    }
