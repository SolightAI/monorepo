import logging
import re

from typing import Callable

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

from src.common.dto import Test

from ..tools import get_prompt_list_of_tools
from ..shared_limitations import SHARED_AGENT_LIMITATIONS

logger = logging.getLogger(__name__)

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


async def is_agent_able_to_run_test(
    task_id: str,
    test: Test,
    agent_tools: list[Callable] | None = None,
    agent_limitations: list[str] | None = None,
    secrets_names: list[str] | None = None,
) -> tuple[bool, str]:
    llm_client = ChatOpenAI(
        model="gpt-4.1",
        temperature=0.0,
        timeout=120,
    )

    logger.info(f"[{task_id}] Running agent health check for {test.name}")

    result: str = (
        await llm_client.ainvoke(
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
        )
    ).content  # type: ignore

    is_able, explanation = _parse_is_agent_able_to_run_test_result(result)

    logger.info(f"[{task_id}] Agent health check result: {is_able} - {explanation}")

    return is_able, explanation


def _parse_is_agent_able_to_run_test_result(result: str) -> tuple[bool, str]:
    decision_match = re.search(r"<decision>(.*?)</decision>", result, re.DOTALL)
    explanation_match = re.search(
        r"<explanation>(.*?)</explanation>", result, re.DOTALL
    )

    if decision_match:
        decision = decision_match.group(1).strip()
    else:
        raise ValueError("No decision found in the result")

    if explanation_match:
        explanation = explanation_match.group(1).strip()
    else:
        raise ValueError("No explanation found in the result")

    return decision == "AGENT ABLE", explanation
