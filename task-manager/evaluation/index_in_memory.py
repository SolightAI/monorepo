import re
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..')) # Add parent directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src')) # Add parent's src directory to sys.path


from typing import Any
from textwrap import dedent
from browser_use import Agent, Controller
from browser_use.agent.views import AgentOutput
from browser_use.browser.context import BrowserContext, BrowserContextConfig, BrowserContextWindowSize
from browser_use.browser.browser import Browser, BrowserConfig
from lmnr import evaluate, LaminarDataset
from src.utils.constants import LMNR_PROJECT_API_KEY
from src.agents._base_agent import AGENT_CLIENT, _get_agent
from src.fixtures.tools import TOOLS
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage, BaseMessage
from langchain_openai import ChatOpenAI
from src.utils.constants import SEED


SUCCESS = 1
FAILURE = 0


LLM_CLIENT = ChatOpenAI(
    model="gpt-4.1-mini",
    temperature=0.0,
    seed=SEED,
    timeout=120,
)



def convert_dict_to_langchain_messages(data: list[dict]) -> list[BaseMessage]:
    """
    Converts a list of message dictionaries (like the user's example)
    into a list of Langchain BaseMessage objects suitable for agent.get_next_action.
    """

    langchain_messages: list[BaseMessage] = []
    last_ai_tool_call_id: str | None = None

    for item in data:

        role = item['role']
        content = item['content']

        if role == 'system':
            langchain_messages.append(SystemMessage(content=str(content)))

        elif role == 'user':
            langchain_messages.append(HumanMessage(content=content))

        elif role == 'assistant':
            ai_message_content = "" # Default for tool calls
            tool_calls_for_message = []

            if isinstance(content, str):
                ai_message_content = content
                last_ai_tool_call_id = None # Reset, as this is not a tool call message

            elif isinstance(content, list): # This is for tool_calls
                for tc_dict in content:
                    if not isinstance(tc_dict, dict):
                        raise ValueError(f"Expected dict for tool call, got {type(tc_dict)} in assistant content.")

                    # Map 'arguments' to 'args'
                    args = tc_dict.get('arguments')
                    if args is None:
                        # Fallback or error if 'arguments' key is missing, depending on strictness
                        # For now, let's assume it might be directly 'args' in some cases or needs adjustment
                        args = tc_dict.get('args', {})


                    tool_calls_for_message.append({
                        'name': tc_dict['name'],
                        'args': args,
                        'id': tc_dict['id'],
                        'type': tc_dict.get('type', 'tool_call') # 'tool_call' is the typical type
                    })

                if tool_calls_for_message:
                    # Store the ID of the first tool call for the next ToolMessage
                    last_ai_tool_call_id = tool_calls_for_message[0]['id']
                else:
                    last_ai_tool_call_id = None
            else:
                raise ValueError(f"Unexpected content type for assistant role: {type(content)}")

            langchain_messages.append(AIMessage(content=ai_message_content, tool_calls=tool_calls_for_message if tool_calls_for_message else None))

        elif role == 'tool':
            if last_ai_tool_call_id is None:
                # This might happen if the history starts with a tool message or there's a mismatch.
                # Depending on how strict the input 'data' is, you might error or try to infer.
                # For this example, we'll raise an error.
                # In your agent's actual message manager (MessageManager.add_tool_message), 
                # tool_id is carefully managed.
                raise ValueError(
                    "Encountered a ToolMessage but no preceding AIMessage tool_call_id was found or it was already consumed."
                )

            langchain_messages.append(ToolMessage(content=str(content), tool_call_id=last_ai_tool_call_id))
            last_ai_tool_call_id = None # Mark this ID as consumed for this ToolMessage

        else:
            raise ValueError(f"Unknown role: {role}")

    return langchain_messages


def replace_dataset_message_context_with_agent_message_context(data: list[BaseMessage], agent: Agent) -> list[BaseMessage]:
    """
    Replaces the message_context present in the provided dataset element with the agent's current message_context.
    This allows us to evaluate the impact of the message_context on the agent's behavior.

    Args:
        data (list[BaseMessage]): The data to replace the message context with.
        agent (Agent): The agent to get the message context from.

    Returns:
        list[BaseMessage]: The data with the message context replaced.
    """

    if len(data) < 2:
        print("[DEBUG] Not enough messages to replace message context")
        return data

    if data[1].type == 'human' and data[1].content.startswith("Context for the task"):
        del data[1]

    if agent.settings.message_context is not None:
        # WARNING: this can change once we upgrade from 0.41 to a newer version of browser-use
        data.insert(1,  HumanMessage(content='Context for the task' + agent.settings.message_context))

    return data


async def dummy_executor(data: list[dict[str, Any]]) -> str:
    """Dummy executor that returns a string.

    Args:
        data (dict): The data to evaluate.

    Returns:
        str: A string.
    """

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

    context = BrowserContext(browser=browser, config=BrowserContextConfig(
        # cookies_file=cookies_file.name,
        minimum_wait_page_load_time=1,
        wait_for_network_idle_page_load_time=1,
        viewport_expansion=0,
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246",
        browser_window_size=BrowserContextWindowSize(width=1920, height=1080),
    ))

    controller = Controller()

    for tool in (TOOLS or []):

        if not tool.__doc__:
            raise ValueError(f"Tool {tool.__name__} has no docstring")

        controller.action(tool.__doc__.strip() or "")(tool)


    agent: Agent = _get_agent(context=context, controller=controller, prompt="dummy", sensitive_data={}, url="www.dummy.com", llm=AGENT_CLIENT)

    input_messages: list[BaseMessage] = convert_dict_to_langchain_messages(data)

    input_messages = replace_dataset_message_context_with_agent_message_context(input_messages, agent)

    output: AgentOutput = await agent.get_next_action(input_messages)

    memory: str = output.current_state.memory

    return memory


async def evaluator_index_in_memory(executor_output: str, label: list[list[dict[str, Any]]]) -> int:
    """Check if the agent saved an index in its memory. (It should not)

    Args:
        executor_output (str): The output of the executor.
        label (list[list[dict[str, Any]]]): The label of the data.

    Returns:
        bool: 1 if the agent DID NOT save an index in its memory, 0 otherwise.
        (Why 1 when it did not save an index? Because "1" means success, and "0" means failure.)
    """

    if "at index " in executor_output.lower(): # i.e "at index 123"
        return FAILURE

    if re.findall(r'at index \[(\d+)\]', executor_output): # i.e "index [123]"
        return FAILURE

    if re.findall(r'at index \((\d+)\)', executor_output): # i.e "index [123]"
        return FAILURE

    if re.findall(r'\(index (\d+)\)', executor_output): # i.e "(index 123)"
        return FAILURE

    # (match: "index 123", "[123]", "(123)")
    indices = re.findall(r'\(index (\d+)\)|\[(\d+)\]|\((\d+)\)', executor_output)
    if not indices:
        return SUCCESS  # very low likelihood of containing an index, skipping llm check to save money

    message = {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": dedent("""
                    You given a string that mentions different html elements, you need to determine if it contains an index.

                    Examples containing an index:
                    - Visa card number (4000000000009979) at index 27 is empty.
                    - Need to fill in contact name (28).
                    - Filling user name [28] in the input field
                    - Credit card section completed. Random email: jeffreyharper14d@solight-email.com. Next: fill billing info (first name [45], last name [47], address [49], city [53], state [55], zip [57]), set country to US [59], set phone country to United States [60], enter valid US phone number [61], handle SMS updates checkbox [63].
                    - Credit card section completed. Attempted to enter contact email at index 0, but failed. The correct email input field is not visible in the current viewport. Need to locate and fill the contact email field before proceeding with billing and phone info.

                    Examples not containing an index:
                    - Visa card number (4000000000009979) is empty.
                    - Need to fill in contact name.
                    - Filling user name in the input field
                    - Ready to locate and click on the trending or search result link for 'Diana Krall' to view all upcoming events. 0 out of 1 event listing navigation completed
                    - Credit card section completed with valid Visa details and invalid CVC. Next: fill contact email, billing info (first name, last name, address, city, state, zip), set country to US, set phone country to United States, enter valid US phone number, handle SMS updates checkbox. 1 out of 1 credit card input sets filled.

                    The string is:
                    <input>
                    {executor_output}
                    </input>

                    If the string contains an index, return "true". Otherwise, return "false".
                    Do not return any other text, only "true" or "false".
                """.format(executor_output=executor_output)),
            },
        ],
    }

    result: str = (await LLM_CLIENT.ainvoke([message])).content  # type: ignore

    print(f"{result=}")

    if "true" in result.lower():
        return FAILURE

    if "false" in result.lower():
        return SUCCESS

    raise ValueError(f"Invalid result: {result}")


if __name__ == "__main__":
    evaluate(
        data=LaminarDataset("Wrong Indexes"),
        executor=dummy_executor,
        evaluators={"index_in_memory": evaluator_index_in_memory},
        project_api_key=LMNR_PROJECT_API_KEY,
        # group_name="default",
    )
