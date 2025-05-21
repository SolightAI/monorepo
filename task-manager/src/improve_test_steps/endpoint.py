from utils.dto import Test
from textwrap import dedent
from logging import getLogger
from utils.dto import Product
from utils.dto import TestStatus
from typing import Any, Optional
from utils.constants import SEED
from crypto.crypto import crypto_service
from langchain_openai import ChatOpenAI
from agents._base_agent import run_agent, format_secrets
from fixtures.tools import TOOLS, get_prompt_list_of_tools
from fixtures.authentification.get_auth_session import get_auth_session
from lmnr import Laminar, observe


logger = getLogger(__name__)


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


LLM_FORMAT = ChatOpenAI(
    model="gpt-4.1-mini",
    temperature=0.0,
    timeout=120,
    seed=SEED,
)


@observe()
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

    Laminar.set_session(session_id=ctx['job_id'])
    Laminar.set_metadata({"task_id": ctx['job_id'], "job": improve_test_steps.__name__})

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
        sensitive_data=format_secrets(secrets) if secrets is not None else dict(),
        auth_session=auth_session,
        tools=TOOLS,
    )

    final_result = history.final_result()

    if final_result is None:
        return {
            "status": TestStatus.FAILED.value,
            "results": "No result from agent",
        }

    return {
        "status": TestStatus.PASSED.value,
        "results": history.final_result(),
    }
