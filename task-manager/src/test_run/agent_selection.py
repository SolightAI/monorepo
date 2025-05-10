import re
import os
import typing
import types
import enum
import traceback

from typing import Any, Callable
from utils.dto import Test
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from agents.general_agent import general_agent, get_parameters_for_general_agent
from agents.login_agent import login_agent, get_parameters_for_login_agent
from agents.signup_agent import signup_agent, get_parameters_for_signup_agent
from inspect import getfullargspec, isclass
from logging import getLogger
from utils.constants import SEED
from utils.s3_utils import exists_in_s3, download_file_from_s3, upload_file_to_s3
from tempfile import NamedTemporaryFile, TemporaryDirectory


logger = getLogger(__name__)


AGENTS: dict[Callable, Callable] = {
    general_agent: get_parameters_for_general_agent,
    login_agent: get_parameters_for_login_agent,
    signup_agent: get_parameters_for_signup_agent,
}


LLM_CLIENT = ChatOpenAI(
    model="gpt-4.1-mini",
    temperature=0.0,
    seed=SEED,
)


AGENT_DESCRIPTION = """
<agent>
Name: {name}
Parameters: {parameters}
Description: {description}
</agent>
""".strip()


PROMPT_AGENT_SELECTOR = """
You are an AI assistant specialized in test automation engineering. Your task is to analyze a given test and select the most appropriate agent from a provided list to execute that test.

First, review the following information:

<available_agents>
{agents}
</available_agents>

<test_description>
{test}
</test_description>

Your goal is to select the most suitable agent for the test described above. To accomplish this, please follow these steps:

1. Carefully analyze the test description, considering factors such as:
   - The task of the test
   - Any particular requirements or constraints

2. Review the list of available agents, taking note of their capabilities and specialties.

3. Think through the selection process step by step, considering how each agent's capabilities match the test requirements.

4. Make a final decision on which agent is best suited for the test.

5. Provide your step-by-step reasoning inside the analysis tags.

6. State your final agent selection in the <agent> tags.

Please ensure that your thinking process is thorough and that you clearly justify your final selection. Your output should follow this structure:

<analysis>
1. List key requirements from the test description:
   - Requirement 1
   - Requirement 2
   - ...

2. For each agent, list their capabilities and how they match or don't match the test requirements:
   Agent 1:
   - Capability 1: Matches/Doesn't match requirement X
   - Capability 2: Matches/Doesn't match requirement Y
   - ...
   Overall score (1-5): [Score]

   Agent 2:
   - ...

3. Compare the agents' scores and capabilities to determine the best fit.

4. Justify the final selection based on the analysis.
</analysis>

<agent>
[Name of the selected agent]
</agent>

Remember, the quality of your analysis and the clarity of your explanation are crucial for making the right agent selection. It's OK for the analysis section to be quite long.
"""


PROMPT_PARAMETERS_SELECTOR = """
You are an AI assistant specialized in test automation engineering. Your task is to analyze a given test and select the most appropriate parameters for the agent from a provided list to execute that test.

First, review the following information:

<agent_description>
{agent_description}
</agent_description>

<test_description>
{test_description}
</test_description>

<additional_types>
{additional_types}
</additional_types>

Your goal is to select the most suitable parameters for the agent. To accomplish this, please follow these steps:

1. Carefully analyze the agent description, test description, and additional types provided.
2. Think about what parameters are needed to execute the test effectively. Consider the specific requirements of the test, the capabilities of the agent, and any additional information provided.
3. Write your thinking process and analysis inside <analysis> tags. This should include your reasoning for why certain parameters are necessary and how they relate to the test requirements.
4. Based on your analysis, select the most suitable parameters for the agent from the information provided.
5. Output your selected parameters in the specified format.

Output your response in the following format:

<analysis>
[Your detailed analysis and reasoning for parameter selection]
</analysis>

<output>
<parameter>
<parameter_name>
[name of the parameter]
</parameter_name>
<parameter_value>
[Selected parameter value]
</parameter_value>
</parameter>
[Repeat for each selected parameter]
</output>

Ensure that your analysis is thorough and that your parameter selections are well-justified based on the provided information. If there are any ambiguities or if you need to make assumptions, state them clearly in your analysis.
"""


def get_test_prompt_description(test: Test) -> str:
    return f"""
    <test_description>
    <name>
    {test.name}
    </name>
    <description>
    {test.description}
    </description>
    <steps>
    {test.steps}
    </steps>
    </test_description>
    """


def get_agent_prompt_description(agent: Callable) -> str:
    spec = getfullargspec(agent)
    parameters = "".join([f"\n- {name}: {spec.annotations[name]}" for name in spec.args])
    return AGENT_DESCRIPTION.format(name=agent.__name__, description=agent.__doc__, parameters=parameters)


def parse_agent_selection(response: str) -> str:
    match = re.search(r"<agent>(.*?)</agent>", response, re.DOTALL)
    if match:
        return match.group(1).strip()
    raise ValueError(f"Agent selection not found in response: {response}")


def get_type_description(_type: type) -> str:
    new_line = "\n"
    origin = typing.get_origin(_type)
    args = typing.get_args(_type)

    try:
        if origin is typing.Literal:
            options_str = ' '.join([f'{new_line}- {repr(arg)}' for arg in args])
            description = f"Name: Literal\nType: typing.Literal\nOptions: {options_str}"

        elif origin is typing.Union or origin is types.UnionType:
            union_args = [arg for arg in args if arg is not type(None)]
            type_descriptions = [get_type_description(arg) for arg in union_args]
            optional_indicator = " (Optional)" if type(None) in args else ""
            description = f"Name: Union{optional_indicator}\nType: typing.Union\nPossible Types:{new_line}{new_line.join(type_descriptions)}"

        elif isclass(_type) and isinstance(_type, type) and issubclass(_type, enum.Enum):
            description = f"Name: {_type.__name__}\nType: {type(_type)}\nDescription: {_type.__doc__}"
            description += f"\nOptions: {' '.join([f'{new_line}- {name}: {value.value}' for (name, value) in _type.__members__.items()])}"

        else:
            description = f"Name: {_type.__name__}\nType: {type(_type)}\nDescription: {_type.__doc__}"

    except Exception as e:
        logger.error(f"Error getting type description: {e}")
        logger.error(traceback.format_exc())
        description = f"Name: {_type.__name__}\nType: {type(_type)}\nDescription: {_type.__doc__}"

    return description


async def select_agent_to_use(test: Test) -> Callable:

    query = HumanMessage(
        content=PROMPT_AGENT_SELECTOR.format(
            test=get_test_prompt_description(test),
            agents="\n---\n".join([
                "<agent>\n" + get_agent_prompt_description(agent) + "\n</agent>" for agent in AGENTS.keys()
            ])
        )
    )

    response: str = (await LLM_CLIENT.ainvoke([query])).content  # type: ignore

    agent_name = parse_agent_selection(response)

    for _agent in AGENTS.keys():
        if _agent.__name__ == agent_name:
            return _agent

    raise ValueError(f"Agent {agent_name} not found")


async def select_and_call_agent(
    identifier: str | None,
    task_id: str,
    test: Test,
    secrets: list[dict[str, Any]],
    auth_session: dict[str, dict[str, str]],
) -> dict:

    logger.info(f"[{task_id}] Selecting agent for test {test.name}")

    cache_key = f"{identifier}/selected_agent.txt"

    agent = None
    agent_was_newly_selected = False

    if exists_in_s3(cache_key):

        logger.info(f"[{task_id}] Selecting agent from cache")

        with TemporaryDirectory() as temp_dir:

            logger.info(f"[{task_id}] Downloading agent name from s3: {cache_key}")
            download_file_from_s3(cache_key, os.path.join(temp_dir, "selected_agent.txt"))

            with open(os.path.join(temp_dir, "selected_agent.txt"), "r") as f:
                agent_name = f.read().strip()

            for _agent in AGENTS.keys():
                if _agent.__name__ == agent_name:
                    agent = _agent
                    break

            if agent is None:
                logger.warning(f"[{task_id}] Cached agent {agent_name=} not found in the list of available agents")
    else:
        logger.info(f"[{task_id}] No cached agent found, selecting agent")

    if not agent:
        agent = await select_agent_to_use(test)
        agent_was_newly_selected = True

    logger.info(f"[{task_id}] Calling agent {agent.__name__}")

    if identifier and agent_was_newly_selected:
        with NamedTemporaryFile(mode="w+", suffix=".txt", delete=False) as selected_agent_file:
            logger.info(f"[{task_id}] Uploading agent name '{agent.__name__}' to cache: {cache_key}")
            selected_agent_file.write(agent.__name__)
            selected_agent_file.flush()
            selected_agent_file.seek(0)

            upload_file_to_s3(selected_agent_file.name, cache_key)

    return await agent(**AGENTS[agent](identifier, task_id, test, secrets, auth_session))
