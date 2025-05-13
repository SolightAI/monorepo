import os
import re
import json
import asyncio

from PIL import Image
from typing import Any
from utils.dto import Test
from typing import Callable
from logging import getLogger
from utils.dto import TestStatus
from utils.constants import SEED
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from agents.run_cached_history import rerun_history
from hooks.on_step_start_hook import on_step_start_hook
from fixtures.tools import TOOLS, get_prompt_list_of_tools
from tempfile import NamedTemporaryFile, TemporaryDirectory
from healthchecks import get_prompt_list_of_healthchecks, HEALTHCHECKS
from utils.s3_utils import upload_file_to_s3, download_file_from_s3, exists_in_s3
from browser_use import Agent, Browser, BrowserConfig, AgentHistoryList, Controller
from browser_use.browser.context import BrowserContextConfig, BrowserContext, BrowserContextWindowSize


SHARED_AGENT_LIMITATIONS = [
    "The agent cannot upload or download any type of file (including images, videos, documents, etc.).",
    "The agent cannot interact with OS file selectors, uploaders, or file dialogs.",
    "The agent cannot leave the website to perform any google search or action outside the website (except for google oauth).",
    "The agent cannot change the window size or viewport size.",
]


ABILITY_TO_RUN_TEST_PROMPT = """
You are an AI assistant acting as a test automation engineer. Your task is to review a provided test and determine if an agent can run the test based on specific limitations. Here is the test information:

<test_info>
<test_name>
{{test.name}}
</test_name>

<test_description>
{{test.description}}
</test_description>

<test_preconditions>
{{test.preconditions}}
</test_preconditions>

<test_steps>
{{test.steps}}
</test_steps>

<test_assertions>
{{test.assertions}}
</test_assertions>
</test_info>

Your task is to carefully review this test information and determine if the agent can run the test.

Consider the following limitations of the agent:
{shared_agent_limitations}
{{agent_limitations}}

Consider the following tools that the agent has access to:
{{agent_tools}}

Keep in mind that the agent will have access to the following credentials:
{{secrets_names}}

Analysis Process:
1. Examine each aspect of the test (name, description, preconditions, steps, and assertions) separately.
2. For each aspect:
   a. Quote the entire content.
   b. Identify key elements that might conflict with the agent's limitations.
   c. Analyze each limitation separately:
      - State whether there's a conflict and explain why or why not.
      - If a conflict is found, note which specific limitation it violates.
      - If the test requires credentials, check if the agent has access to them.
   d. Summarize any conflicts found in this section.
3. Keep a running count of any limitations encountered.

Provide your analysis within <test_review> tags. Structure your analysis as follows:

<test_review>
[Test Name Analysis]
[Test Description Analysis]
[Test Preconditions Analysis]
[Test Steps Analysis]
[Test Assertions Analysis]
[Summary of Limitations Encountered]
</test_review>

In the Summary of Limitations Encountered, provide a numbered list of all conflicts found throughout the test.

After your analysis, provide your final decision and explanation using the following structure:

<decision>AGENT LIMITATION or AGENT ABLE</decision>
<explanation>[Brief explanation of why the agent cannot run the test or confirmation that the agent can run the test]</explanation>

Example output structure:

<test_review>
Test Name Analysis:
[Quoted content]
[Key elements identified]
[Analysis against each limitation]
[Summary of conflicts in this section]

Test Description Analysis:
[Quoted content]
[Key elements identified]
[Analysis against each limitation]
[Summary of conflicts in this section]

...

Summary of Limitations Encountered:
1. [First conflict found]
2. [Second conflict found]
...
</test_review>

<decision>AGENT LIMITATION</decision>
<explanation>The agent cannot run this test because it requires file uploading, which violates limitation #1.</explanation>

OR

<decision>AGENT ABLE</decision>
<explanation>The agent can run this test as it does not violate any of the specified limitations.</explanation>

Please proceed with your analysis and decision.
""".strip().format(
    shared_agent_limitations="\n".join(SHARED_AGENT_LIMITATIONS),
)


CHECK_FINAL_TEST_RESULT_PROMPT = """
You are an AI assistant acting as a test automation engineer. Your task is to review a software test, the output from an agent that ran the test, and any additional healthcheck results. Based on this information, you need to determine if the test was successful and provide a detailed explanation of your conclusion.

First, examine the agent's output from running the test:

<agent_output>
{{agent_output}}
</agent_output>

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
* All steps up to the failure point completed without tool or environment errors.
* At least one assertion (e.g. "element X is visible" or "text Y appears") evaluated to false.

Example: Clicking "Add to cart" succeeds, but the cart counter stays at zero.

{AGENT_LIMITATION}: The test couldn't even start or proceed because the agent itself hit a limitation—not because the site under test is broken or missing a feature.

Common causes:
* Unsupported action: The script asks the agent to do something it doesn't yet support (e.g. drag-and-drop, file upload, media playback).
* Environment error: Browser crash, network timeout, or runtime exception in the agent's code.
* Resource constraints: Out-of-memory or excessive CPU use prevented test continuation.
* Configuration issues: Missing driver, incorrect browser version, wrong credentials for the test runner.

Note: In all of these cases, the website may be perfectly fine—this status flags a gap in your automation layer.

{NOT_FOUND}: The agent ran the script up to the point of looking for a site feature, but that feature wasn't found.

Criteria:
* Locator lookups (by selector, text, etc.) return zero matches repeatedly.
* No errors in the agent itself—only a "not found" result.

Example: A test tries to click a "Help" link, but the page has no such link.

{BLOCKED_BY_CAPTCHA}: The agent is explicitly prevented from proceeding by an anti-bot measure.

Criteria:
* A Captcha widget appears, or the page redirects to a challenge.
* HTTP responses (e.g. 403) or Cloudflare blocks indicate a bot challenge.

Example: After login attempts, the agent is met with Google reCAPTCHA or a "verify you're human" interstitial.

Please follow these steps:
1. Analyze the test information, agent output, and healthcheck results thoroughly.
2. Consider how the agent's output aligns with the test's expectations and assertions.
3. Look for any indications of test failure, agent limitations, missing features, or blocking factors like CAPTCHAs.
4. Determine which of the possible outcomes best describes the test result.
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


SELECT_ADDITIONAL_TEST_PROMPT = """
You are an AI assistant acting as a test automation engineer. Your task is to review a provided test and select the most appropriate healthcheck(s) from a list to verify the final result of the test. You may select multiple healthchecks if appropriate, or select none if no relevant healthchecks are found.

First, let's review the test information:

<test_name>
{test.name}
</test_name>

<test_description>
{test.description}
</test_description>

<test_preconditions>
{test.preconditions}
</test_preconditions>

<test_steps>
{test.steps}
</test_steps>

<test_assertions>
{test.assertions}
</test_assertions>

Now, here is the list of possible healthchecks:

<healthcheck_list>
{healthcheck_list}
</healthcheck_list>

Your task is to:
1. Carefully review the test information.
2. Examine the list of possible healthchecks.
3. Determine which, if any, of the healthchecks are relevant to verifying the final result of the test.
4. Select the best healthcheck(s) if relevant ones are found.
5. If no relevant healthchecks are found, clearly indicate this in your final answer.

Before providing your final answer, conduct a thorough analysis by wrapping your evaluation in <healthcheck_evaluation> tags. Follow these steps in your evaluation:

1. Summarize the key aspects of the test (what it's testing, its preconditions, steps, and assertions).
2. List out each of the test's assertions explicitly and note the expected outcomes.
3. For each healthcheck in the list:
   a. Briefly explain its purpose and functionality.
   b. Match it with specific assertions from the test, if applicable.
   c. Rate its relevance to the test on a scale of 1-5 (1 being not relevant, 5 being highly relevant).
   d. Consider any potential edge cases or limitations of the healthcheck in relation to this test.
4. Compare the relevant healthchecks and explain which one(s) are most suitable for verifying the test's final result, or why none are suitable if that's the case.

After your evaluation, provide your final answer in <final_answer> tags. Your final answer should be either the name(s) of the selected healthcheck(s) or 'None' if no relevant healthchecks were found. If you select healthchecks, wrap each one in its own <selected_healthcheck> tag.

Remember:
- It's completely acceptable to select no healthchecks if none are relevant.
- The key is to choose healthchecks that specifically verify the final result of the test.
- Your selection should be based on the relevance and effectiveness of the healthchecks in relation to the test's assertions and overall purpose.

Example output structure:

<healthcheck_evaluation>
[Detailed evaluation of the test and potential healthchecks]
</healthcheck_evaluation>

<final_answer>
<selected_healthcheck>[Name of selected healthcheck]</selected_healthcheck>
<selected_healthcheck>[Name of another selected healthcheck, if applicable]</selected_healthcheck>
</final_answer>

OR

<final_answer>
None
</final_answer>

Please proceed with your evaluation and selection of the most appropriate healthcheck(s).
""".strip()


DESCRIPTION_HEALTHCHECK_RESULT = """
<healthcheck>
<name>{healthcheck_name}</name>
<description>{healthcheck_description}</description>
<result>{healthcheck_result}</result>
</healthcheck>
""".strip()


OUTPUT_VALIDATION_LLM = ChatOpenAI(
    model="gpt-4.1-mini",
    temperature=0.0,
    seed=SEED,
    timeout=120,
)


LLM_CLIENT = ChatOpenAI(
    model="gpt-4.1",
    temperature=0.0,
    seed=SEED,
    timeout=120,
)


AGENT_CLIENT = ChatOpenAI(
    model="gpt-4.1",
    temperature=0.0,
    timeout=120,
    frequency_penalty=0.3,
    seed=SEED,
)

PLANNER_CLIENT = ChatOpenAI(
    model="gpt-4.1",
    temperature=0.0,
    seed=SEED,
    timeout=120,
)


logger = getLogger(__name__)


def convert_gif_to_images(gif_path: str) -> list[Image.Image]:

    gif = Image.open(gif_path)

    # Store frames in a list
    frames = []

    # Iterate over each frame
    try:
        while True:
            frame = gif.copy()
            frames.append(frame)
            gif.seek(gif.tell() + 1)
    except EOFError:
        pass  # End of sequence

    return frames


def _parse_select_additional_healthcheck_result(result: str) -> tuple[str, list[str]]:
    healthcheck_evaluation_match = re.search(r"<healthcheck_evaluation>(.*?)</healthcheck_evaluation>", result, re.DOTALL)
    final_answer_match = re.search(r"<final_answer>(.*?)</final_answer>", result, re.DOTALL)

    if healthcheck_evaluation_match:
        healthcheck_evaluation = healthcheck_evaluation_match.group(1).strip()
    else:
        raise ValueError("No healthcheck evaluation found in the result")

    if not final_answer_match:
        raise ValueError("No final answer found in the result")

    final_answer_content = final_answer_match.group(1).strip()

    selected_healthchecks = re.findall(r"<selected_healthcheck>(.*?)</selected_healthcheck>", final_answer_content)

    return healthcheck_evaluation, selected_healthchecks


async def run_additional_healthcheck(
    identifier: str,
    task_id: str,
    test: Test,
    existing_session: dict[str, dict[str, str]],
) -> dict[Callable, Any]:

    cache_key = f"{identifier}/selected_healthcheck.json"

    if identifier and exists_in_s3(cache_key):

        logger.info(f"[{task_id}] Selecting additional healthcheck from cache")

        with NamedTemporaryFile(mode="w+", suffix=".json", delete=False) as selected_healthcheck_file:
            download_file_from_s3(cache_key, selected_healthcheck_file.name)

            with open(selected_healthcheck_file.name, "r") as f:
                selected_healthchecks = json.load(f)

    else:
        logger.info(f"[{task_id}] No cached additional healthcheck found, selecting additional healthcheck")

        result: str = (await LLM_CLIENT.ainvoke(
            [
                HumanMessage(
                    content=SELECT_ADDITIONAL_TEST_PROMPT.format(
                        test=test,
                        healthcheck_list=get_prompt_list_of_healthchecks(),
                    )
                )
            ]
        )).content  # type: ignore

        _, selected_healthchecks = _parse_select_additional_healthcheck_result(result)

        with NamedTemporaryFile(mode="w+", suffix=".json", delete=False) as selected_healthcheck_file:
            with open(selected_healthcheck_file.name, "w") as f:
                json.dump(selected_healthchecks, f)

            upload_file_to_s3(selected_healthcheck_file.name, cache_key)

    if not selected_healthchecks:
        return {}

    # Create a list of coroutines to run
    tasks_to_run = []

    # Keep track of the healthcheck functions to map results back
    healthcheck_fn_mapping = []

    for _healthcheck_fn in HEALTHCHECKS:
        if _healthcheck_fn.__name__ in selected_healthchecks:
            tasks_to_run.append(
                _healthcheck_fn(
                    task_id=task_id,
                    test=test,
                    existing_session=existing_session,
                )
            )
            healthcheck_fn_mapping.append(_healthcheck_fn)

    if not tasks_to_run:  # Ensure we don't call gather with an empty list if no healthchecks match
        return {}

    # Run healthchecks concurrently
    results = await asyncio.gather(*tasks_to_run)

    # Map results back to their respective healthcheck functions
    return {
        healthcheck_fn_mapping[i]: results[i]
        for i in range(len(results))
    }


def _parse_check_final_test_result(result: str) -> tuple[TestStatus, str]:
    status_match = re.search(r"<status>(.*?)</status>", result, re.DOTALL)
    explanation_match = re.search(r"<explanation>(.*?)</explanation>", result, re.DOTALL)

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


async def check_final_test_result(
    task_id: str,
    test: Test,
    agent_output: str,
    healthcheck_results: dict[Callable, Any] | None = None,
) -> tuple[TestStatus, str]:

    logger.info(f"[{task_id}] Checking final test result for {test.name}")

    if healthcheck_results is None:
        healthcheck_results = {}

    healthcheck_results_str = "\n".join([
        DESCRIPTION_HEALTHCHECK_RESULT.format(
            healthcheck_name=healthcheck.__name__,
            healthcheck_description=healthcheck.__doc__,
            healthcheck_result=healthcheck_result,
        )
        for healthcheck, healthcheck_result in healthcheck_results.items()
    ])

    result: str = (await OUTPUT_VALIDATION_LLM.ainvoke(
        [
            HumanMessage(
                content=CHECK_FINAL_TEST_RESULT_PROMPT.format(
                    test=test,
                    agent_output=agent_output,
                    healthcheck_results=healthcheck_results_str,
                ).strip()
            )
        ]
    )).content  # type: ignore

    try:
        status, explanation = _parse_check_final_test_result(result)
    except Exception as e:
        logger.error(f"[{task_id}] Error parsing final test result ({e}) : {result}")
        raise e

    logger.info(f"[{task_id}] Final test result: {status} - {explanation}")

    return status, explanation


def _parse_is_agent_able_to_run_test_result(result: str) -> tuple[bool, str]:
    decision_match = re.search(r"<decision>(.*?)</decision>", result, re.DOTALL)
    explanation_match = re.search(r"<explanation>(.*?)</explanation>", result, re.DOTALL)

    if decision_match:
        decision = decision_match.group(1).strip()
    else:
        raise ValueError("No decision found in the result")

    if explanation_match:
        explanation = explanation_match.group(1).strip()
    else:
        raise ValueError("No explanation found in the result")

    return decision == "AGENT ABLE", explanation


async def is_agent_able_to_run_test(
    task_id: str,
    test: Test,
    agent_tools: list[Callable] | None = None,
    agent_limitations: list[str] | None = None,
    secrets_names: list[str] | None = None,
) -> tuple[bool, str]:

    logger.info(f"[{task_id}] Running agent health check for {test.name}")

    result: str = (await LLM_CLIENT.ainvoke(
        [
            HumanMessage(
                content=ABILITY_TO_RUN_TEST_PROMPT.format(
                    test=test,
                    agent_tools=get_prompt_list_of_tools(agent_tools or []),
                    agent_limitations="\n".join(agent_limitations or []),
                    secrets_names=secrets_names or [],
                )
            )
        ]
    )).content  # type: ignore

    is_able, explanation = _parse_is_agent_able_to_run_test_result(result)

    logger.info(f"[{task_id}] Agent health check result: {is_able} - {explanation}")

    return is_able, explanation


def get_agent_thoughts(history: AgentHistoryList) -> list[dict[str, Any]]:
    return [thought.model_dump() for thought in history.model_thoughts()]


def get_agent_actions(history: AgentHistoryList) -> list[dict[str, Any]]:
    return [
        _action | {'interacted_element': _action['interacted_element'].to_dict() if _action['interacted_element'] else None}
        for _action in history.model_actions()
    ]


def format_secrets(secrets: list[dict[str, Any]]) -> dict[str, str]:
    return {
        f"{_secret['category'].strip()}:{_secret['name'].strip()}:{secret_name.strip()}".strip().replace(" ", "_"): secret_value
        for _secret in secrets
        for secret_name, secret_value in _secret['values'].items()
    }


async def _load_local_storage(context: BrowserContext, localStorage: dict[str, str]) -> None:
    load_script = """
    (storage => {
        Object.keys(storage).forEach(key => {
            localStorage.setItem(key, storage[key]);
        });
    })(%s)
    """.strip() % json.dumps(localStorage)
    await context.execute_javascript(load_script)


async def _get_load_local_storage_tool(context: BrowserContext) -> Callable:
    return await context.execute_javascript("""
    (() => {
        const items = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            items[key] = localStorage.getItem(key);
        }
        return items;
    })()
    """.strip())


async def _generate_and_upload_evidences(task_id: str, history: AgentHistoryList) -> list[str]:

    evidences = []

    from browser_use.agent.gif import create_history_gif  # import here to avoid thread blocking

    with TemporaryDirectory() as temp_dir:

        gif_path = os.path.join(temp_dir, "history.gif")

        create_history_gif(
            task="a",
            history=history,
            output_path=gif_path,
            show_task=False,
            show_logo=False,
            show_goals=True,
            title_font_size=20,
            goal_font_size=20,
            font_size=20,
            margin=20,
        )

        images = convert_gif_to_images(gif_path)

        for idx, image in enumerate(images):
            image.save(os.path.join(temp_dir, f"history-{idx}.png"))
            _evidence = upload_file_to_s3(
                file_path=os.path.join(temp_dir, f"history-{idx}.png"),
                object_name=f"{task_id}/{idx}.png",
                content_type="image/png",
            )

            if _evidence is not None:
                evidences.append(_evidence)

    return evidences


async def run_agent(
    identifier: str | None,
    task_id: str,
    url: str,
    prompt: str,
    sensitive_data: dict[str, str],
    auth_session: dict[str, dict[str, str]] | None = None,
    tools: list[Callable] = TOOLS,
    additional_task: str | None = None,
    **kwargs: Any,
) -> tuple[dict[str, dict[str, str]], AgentHistoryList, list[str], bool]:
    """
    Signup to the webapp and return the generated cookies.

    Args:
        identifier: The identifier of the agent.
        task_id: The task id of the agent.
        url: The url of the webapp.
        prompt: The prompt of the agent.
        sensitive_data: The sensitive data of the agent.
        auth_session: The auth session of the agent.
        tools: The tools of the agent.
        **kwargs: Any additional arguments.

    Returns:
        A tuple containing the session data, history, evidences and a boolean indicating if the agent was run from cache.
    """

    evidences = []

    # initialize()

    browser = Browser(
        config=BrowserConfig(
            headless=os.getenv("HEADLESS", "true").lower() == "true",
            extra_browser_args=[
                "--disable-web-security",
                "--disable-site-isolation-trials",
                "--disable-features=IsolateOrigins,site-per-process",
            ],
        )
    )

    with NamedTemporaryFile(mode="w+", suffix=".json", delete=False) as cookies_file:
        if auth_session is not None:
            if auth_session.get("cookies") is not None:
                json.dump(auth_session.get("cookies"), cookies_file)
        else:
            json.dump([], cookies_file)

        cookies_file.flush()

    context = BrowserContext(browser=browser, config=BrowserContextConfig(
        cookies_file=cookies_file.name,
        minimum_wait_page_load_time=1,
        wait_for_network_idle_page_load_time=1,
        viewport_expansion=0,
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246",
        browser_window_size=BrowserContextWindowSize(width=1920, height=1080),
    ))

    try:
        if auth_session and auth_session.get("localStorage") is not None:
            await context.navigate_to(url)  # allowing us to load the localStorage
            await _load_local_storage(context, auth_session["localStorage"])

        controller = Controller()

        for tool in (tools or []):

            if not tool.__doc__:
                raise ValueError(f"Tool {tool.__name__} has no docstring")

            controller.action(tool.__doc__.strip() or "")(tool)

        agent_params = {
            "task": prompt,

            "llm": AGENT_CLIENT,
            "use_vision": False,
            "enable_memory": False,

            "initial_actions": [
                {'go_to_url': {'url': url}},
                {'wait': {'seconds': 5}}
            ],
            "sensitive_data": sensitive_data,
            "browser_context": context,
            "controller": controller,
            "max_actions_per_step": 1,
        }

        logger.info(f"[{task_id}] Checking if history exists in S3 for {identifier}")

        run_agent = True

        try:
            if identifier and exists_in_s3(f"{identifier}/history.json"):

                logger.info(f"[{task_id}] Running agent from cached history")

                with NamedTemporaryFile(mode="w+", suffix=".json", delete=False) as history_file:
                    download_file_from_s3(f"{identifier}/history.json", history_file.name)

                    logger.info(f"[{task_id}] Loading history from {history_file.name} for GIF generation.")

                    agent = Agent(**agent_params)
                    agent._task_id = task_id  # NOTE: we want to use a different agent for rerun_history and agent.run as rerun_history modifies the agent's controller

                    history = await rerun_history(
                        agent,
                        AgentHistoryList.load_from_file(history_file.name, agent.AgentOutput),
                        max_retries=5,  # cost nothing to retry, cost a lot to fail
                        skip_failures=False,
                        delay_between_actions=2,  # leaves time for the page to load (otherwise leads to errors)
                    )

                    run_agent = False

        except Exception:
            logger.info(f"[{task_id}] Couldn't run cached history, running agent again")

        if run_agent:

            logger.info(f"[{task_id}] Running agent for the first time")

            agent = Agent(**(agent_params))
            agent._task_id = task_id

            history = await agent.run(
                max_steps=50,
                on_step_start=on_step_start_hook,
            )

            if additional_task is not None and len(additional_task) > 0:
                injected_agent_state = agent.state
                agent = Agent(**(agent_params | {"injected_agent_state": injected_agent_state, "task": additional_task}))
                agent.add_new_task(additional_task)
                history = await agent.run(
                    max_steps=50,
                    on_step_start=on_step_start_hook,
                )

            logger.info(f"[{task_id}] Agent finished running ({identifier})")

            if identifier:
                with NamedTemporaryFile(mode="w+", suffix=".json", delete=False) as history_file:

                    logger.info(f"[{task_id}] Saving history to {f'{identifier}/history.json'}")

                    history.save_to_file(history_file.name)

                    upload_file_to_s3(
                        file_path=history_file.name,
                        object_name=f"{identifier}/history.json",
                    )

        logger.info(f"[{task_id}] Finished running agent")

        cookies = await context.session.context.cookies()
        localStorage_data = await _get_load_local_storage_tool(context)

        logger.info(f"[{task_id}] Retrieved cookies and localStorage data")

    except Exception as e:
        raise e

    finally:
        await context.close()
        await browser.close()

        logger.info(f"[{task_id}] Closed browser context and browser")

        os.remove(cookies_file.name)

    session_data = {"cookies": cookies, "localStorage": localStorage_data}

    logger.info(f"[{task_id}] Generating evidences")

    evidences = await _generate_and_upload_evidences(task_id, history)

    logger.info(f"[{task_id}] Returning session data, history and evidences")

    return session_data, history, evidences, not run_agent
