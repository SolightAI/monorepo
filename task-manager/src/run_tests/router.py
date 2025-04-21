import re

from enum import Enum
from utils.dto import Test
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage
from run_tests.general_test_runner import general_test_runner_agent, get_parameters_for_general_test_runner
from fixtures.authentification.login_to_website import login_to_website_agent, get_parameters_for_login_to_website
from utils.constants import AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY
from pydantic import SecretStr
from inspect import getfullargspec
from logging import getLogger


logger = getLogger(__name__)


AGENTS = {
    general_test_runner_agent: get_parameters_for_general_test_runner,
    login_to_website_agent: get_parameters_for_login_to_website,
}


LLM_CLIENT = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_key=SecretStr(AZURE_OPENAI_KEY),
    temperature=0.0,
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


def get_agent_prompt_description(agent) -> str:
    spec = getfullargspec(agent)
    parameters = "".join([f"\n- {name}: {spec.annotations[name]}" for name in spec.args])
    return AGENT_DESCRIPTION.format(name=agent.__name__, description=agent.__doc__, parameters=parameters)


def parse_agent_selection(response: str) -> str:
    return re.search(r"<agent>(.*?)</agent>", response, re.DOTALL).group(1).strip()


def get_type_description(_type: type) -> str:
    new_line = "\n"
    description = f"Name: {_type.__name__}\nType: {type(_type)}\nDescription: {_type.__doc__}"

    if isinstance(_type, Enum):
        description += f"\nOptions: {' '.join([f'{new_line}- {name}: {value.value}' for (name, value) in _type.__members__.items()])}"

    return description


def select_agent_to_use(test: Test) -> str:

    query = HumanMessage(
        content=PROMPT_AGENT_SELECTOR.format(
            test=get_test_prompt_description(test),
            agents="\n---\n".join([
                "<agent>\n" + get_agent_prompt_description(agent) + "\n</agent>" for agent in AGENTS.keys()
            ])
        )
    )

    response = LLM_CLIENT.invoke([query])

    agent_name = parse_agent_selection(response.content)

    for _agent in AGENTS.keys():
        if _agent.__name__ == agent_name:
            return _agent

    raise ValueError(f"Agent {agent_name} not found")


async def select_and_call_agent(
    task_id: str,
    test: Test,
    secrets: dict[str, dict[str, str]],
    auth_session: dict[str, dict[str, str]],
) -> dict:

    logger.info(f"[{task_id}] Selecting agent for test {test.name}")

    agent = select_agent_to_use(test)

    logger.info(f"[{task_id}] Calling agent {agent.__name__}")

    return await agent(**AGENTS[agent](task_id, test, secrets, auth_session))