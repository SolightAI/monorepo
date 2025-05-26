import asyncio
import logging
import re
import json

from typing import Callable, Any

from tempfile import NamedTemporaryFile
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

from src.common.dto import Test
from src.config import Config

from .healthchecks import get_prompt_list_of_healthchecks, HEALTHCHECKS

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


logger = logging.getLogger(__name__)


async def run_additional_healthcheck(
    config: Config,
    task_id: str,
    identifier: str | None,
    test: Test,
    existing_session: dict[str, dict[str, str]],
) -> dict[Callable, Any]:
    llm_client = ChatOpenAI(
        model="gpt-4.1",
        temperature=0.0,
        timeout=120,
    )

    cache_key = f"{identifier}/selected_healthcheck.json"

    if identifier and config.s3_client.exists(cache_key):
        logger.info(f"[{task_id}] Selecting additional healthcheck from cache")

        with NamedTemporaryFile(
            mode="w+", suffix=".json", delete=False
        ) as selected_healthcheck_file:
            config.s3_client.download_file(cache_key, selected_healthcheck_file.name)

            with open(selected_healthcheck_file.name, "r") as f:
                selected_healthchecks = json.load(f)

    else:
        logger.info(
            f"[{task_id}] No cached additional healthcheck found, selecting additional healthcheck"
        )

        result: str = (
            await llm_client.ainvoke(
                [
                    HumanMessage(
                        content=SELECT_ADDITIONAL_TEST_PROMPT.format(
                            test=test,
                            healthcheck_list=get_prompt_list_of_healthchecks(),
                        )
                    )
                ]
            )
        ).content  # type: ignore

        _, selected_healthchecks = _parse_select_additional_healthcheck_result(result)

        if identifier:
            with NamedTemporaryFile(
                mode="w+", suffix=".json", delete=False
            ) as selected_healthcheck_file:
                with open(selected_healthcheck_file.name, "w") as f:
                    json.dump(selected_healthchecks, f)

                config.s3_client.upload_file(selected_healthcheck_file.name, cache_key)

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
                    config=config,
                    task_id=task_id,
                    test=test,
                    existing_session=existing_session,
                )
            )
            healthcheck_fn_mapping.append(_healthcheck_fn)

    if (
        not tasks_to_run
    ):  # Ensure we don't call gather with an empty list if no healthchecks match
        return {}

    # Run healthchecks concurrently
    results = await asyncio.gather(*tasks_to_run)

    # Map results back to their respective healthcheck functions
    return {healthcheck_fn_mapping[i]: results[i] for i in range(len(results))}


def _parse_select_additional_healthcheck_result(result: str) -> tuple[str, list[str]]:
    healthcheck_evaluation_match = re.search(
        r"<healthcheck_evaluation>(.*?)</healthcheck_evaluation>", result, re.DOTALL
    )
    final_answer_match = re.search(
        r"<final_answer>(.*?)</final_answer>", result, re.DOTALL
    )

    if healthcheck_evaluation_match:
        healthcheck_evaluation = healthcheck_evaluation_match.group(1).strip()
    else:
        raise ValueError("No healthcheck evaluation found in the result")

    if not final_answer_match:
        raise ValueError("No final answer found in the result")

    final_answer_content = final_answer_match.group(1).strip()

    selected_healthchecks = re.findall(
        r"<selected_healthcheck>(.*?)</selected_healthcheck>", final_answer_content
    )

    return healthcheck_evaluation, selected_healthchecks
