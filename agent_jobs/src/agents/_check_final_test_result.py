import logging

import re
from typing import Callable, Any

from langchain_openai import ChatOpenAI

from src.common.dto import Test, TestStatus

logger = logging.getLogger(__name__)

DESCRIPTION_HEALTHCHECK_RESULT = """
<healthcheck>
<name>{healthcheck_name}</name>
<description>{healthcheck_description}</description>
<result>{healthcheck_result}</result>
</healthcheck>
""".strip()


CHECK_FINAL_TEST_RESULT_PROMPT = """
You are an AI assistant acting as a test automation engineer. Your task is to review a software test, the output from an agent that ran the test, the screenshot of the web-app's final state, and any additional healthcheck results. Based on this information, you need to determine if the test was successful and provide a detailed explanation of your conclusion.
You're the one deciding of the final test result, not the agent.

First, examine the agent's output from running the test:

<agent_output>
{{agent_output}}
</agent_output>

Then, examine the provided screenshot of the web-app's final state.

Now, review the following test information:

<test_info>
<name>{{test.name}}</name>

<description>{{test.description}}</description>

<steps>{{test.steps}}</steps>

<assertions>{{test.assertions}}</assertions>
</test_info>

Finally, review any additional healthcheck results (if available):

<healthcheck_results>
{{healthcheck_results}}
</healthcheck_results>

If there's a conflict between the agent's output and the healthchecks, the healthcheck result is authoritative.

Your task is to carefully analyze this information and determine the final result of the test. The possible outcomes are:

{TEST_SUCCESSFUL}: The agent executed every step of the test script without errors, and all assertions passed.

Criteria:
* No exceptions or timeouts occurred at runtime.
* The page behaved exactly as the test expected (elements found, clicks succeeded, data matched).

Example: Filling in a login form, submitting it, and seeing the "Welcome" message.

{TEST_FAILED}: The agent ran the test but one or more assertions did not hold true.

Criteria:
* A precondition was not met.
* All steps up to the failure point completed without tool or environment errors.
* At least one assertion (e.g. "element X is visible" or "text Y appears") evaluated to false.

Example: Clicking "Add to cart" succeeds, but the cart counter stays at zero.

{AGENT_LIMITATION}: The test couldn't even start or proceed because the agent itself hit a limitation.

Criteria:
* Unsupported action: The script asks the agent to do something it doesn't yet support (e.g. drag-and-drop, file upload, media playback).

Note: In all of these cases, the website may be perfectly fine—this status flags a gap in your automation layer.

{NOT_FOUND}: The agent could not find a UI element or feature required to perform a scripted action (e.g., click, type), thus preventing the test from proceeding. If an explicit test assertion fails because the element it refers to is not found, that should be categorized as {TEST_FAILED}.

Criteria:
* Locator lookups (by selector, text, etc.) return zero matches repeatedly.

Example: The test script needs to test the "Checkout" feature but the agent could not find how to start the checkout process.

{BLOCKED_BY_CAPTCHA}: The test execution was halted because an anti-bot measure (e.g., a CAPTCHA) directly prevented the agent from starting or continuing the test. This status should be used only when the CAPTCHA is the primary reason the test could not run or proceed.

Criteria:
* A Captcha widget appears, or the page redirects to a challenge page preventing the agent from proceeding.
* HTTP responses (e.g. 403) or Cloudflare blocks indicate a bot challenge preventing the agent from proceeding.

Example: After login attempts, the agent is met with Google reCAPTCHA or a "verify you're human" interstitial.

Please follow these steps:
1. Analyze the test information, agent output, and healthcheck results thoroughly.
2. Consider how the agent's output aligns with the test's expectations and assertions.
3. Look for any indications of test failure, agent limitations, missing features, or blocking factors like CAPTCHAs.
4. Determine which of the possible outcomes best describes the test result. You're strictly limited to the previously defined outcomes.
5. Provide a short explanation for your decision.

Wrap your analysis inside <analysis> tags to show your thought process before providing your final decision and explanation. Your analysis should include:

a. A summary of the test information
b. A list of key points from the agent output
c. Any relevant notes from the healthcheck results
d. An evaluation of each possible outcome against the evidence

Then, present your final result in the following format:

<status>
[One of the possible final status]
</status>

<explanation>
[Your short explanation for the chosen result. This is what the user will see in the test result.]
</explanation>

Remember to base your analysis and conclusion solely on the information provided in the test details, agent output, and healthcheck results. Do not make assumptions beyond what is explicitly stated or can be directly inferred from the given data.
Don't forget to close any open tags.
""".strip().format(
    TEST_SUCCESSFUL=TestStatus.PASSED.name,
    TEST_FAILED=TestStatus.FAILED.name,
    AGENT_LIMITATION=TestStatus.AGENT_LIMITATION.name,
    NOT_FOUND=TestStatus.NOT_FOUND.name,
    BLOCKED_BY_CAPTCHA=TestStatus.BLOCKED_BY_CAPTCHA.name,
)


async def check_final_test_result(
    task_id: str,
    test: Test,
    agent_output: str,
    screenshot_base64: str | None = None,
    healthcheck_results: dict[Callable, Any] | None = None,
) -> tuple[TestStatus, str]:
    """
    Determines the final result of a test based on agent output and healthcheck results.

    Args:
        task_id (str): The ID of the task.
        test (Test): The test object containing details like name, description, steps, and assertions.
        agent_output (str): The output generated by the agent while running the test.
        screenshot_base64 (str | None, optional): A screenshot base64 encoded
        healthcheck_results (dict[Callable, Any] | None, optional): A dictionary where keys are healthcheck functions
                                                                  and values are their corresponding results. Defaults to None.

    Raises:
        ValueError: If the result from the language model is improperly formatted (e.g., missing status or explanation).

    Returns:
        tuple[TestStatus, str]: A tuple containing the final status of the test (e.g., PASSED, FAILED)
                                and a string explanation for that status.
    """

    logger.info(f"[{task_id}] Checking final test result for {test.name}")

    if healthcheck_results is None:
        healthcheck_results = {}

    healthcheck_results_str = "\n".join(
        [
            DESCRIPTION_HEALTHCHECK_RESULT.format(
                healthcheck_name=healthcheck.__name__,
                healthcheck_description=healthcheck.__doc__,
                healthcheck_result=healthcheck_result,
            )
            for healthcheck, healthcheck_result in healthcheck_results.items()
        ]
    )

    prompt = CHECK_FINAL_TEST_RESULT_PROMPT.format(
        test=test,
        agent_output=agent_output,
        healthcheck_results=healthcheck_results_str,
    ).strip()

    message: dict[str, Any] = {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": prompt,
            },
        ],
    }

    if screenshot_base64:
        message["content"].append(
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{screenshot_base64}"},
            }
        )

    max_try = 3

    llm_client = ChatOpenAI(
        model="gpt-4.1-mini",
        temperature=0.0,
        timeout=120,
    )

    for attempt in range(max_try):
        try:
            result: str = (await llm_client.ainvoke([message])).content  # type: ignore
            status, explanation = _parse_check_final_test_result(result)
            break
        except Exception as e:
            logger.error(
                f"[{task_id}] Error parsing final test result (attempt {attempt + 1}/{max_try + 1}) ({e})"
            )

            if attempt >= max_try - 1:
                logger.error("Reached max-try, raising error.")
                raise RuntimeError(f"Failed to parse final test result: {e}")

    logger.info(f"[{task_id}] Final test result: {status} - {explanation}")  # type: ignore (TODO(TomChv): Is the value really unbound?)

    return status, explanation  # type: ignore (TODO(TomChv): Is the value really unbound?)


def _parse_check_final_test_result(result: str) -> tuple[TestStatus, str]:
    status_match = re.search(r"<status>(.*?)</status>", result, re.DOTALL)
    explanation_match = re.search(
        r"<explanation>(.*?)</explanation>", result, re.DOTALL
    )

    if status_match:
        status = status_match.group(1).strip()
    else:
        raise ValueError("No status found in the result")

    if explanation_match:
        explanation = explanation_match.group(1).strip()
    else:
        raise ValueError(f"No explanation found in the result: {result}")

    try:
        status = TestStatus[status]
    except KeyError:
        raise ValueError(f"Invalid status: {status}")

    return status, explanation
