from typing import Any

from browser_use import Controller, Agent
from browser_use.browser.context import BrowserContext
from langchain_openai import ChatOpenAI


class AgentParam:
    context: BrowserContext
    controller: Controller
    prompt: str
    sensitive_data: dict[str, str] | None
    url: str

    def __init__(
        self,
        context: BrowserContext,
        controller: Controller,
        prompt: str,
        sensitive_data: dict[str, str] | None,
        url: str,
    ):
        self.context = context
        self.controller = controller
        self.prompt = prompt
        self.sensitive_data = sensitive_data
        self.url = url


def get_agent(param: AgentParam, **kwargs: Any) -> Agent:
    rules_for_message_context = [
        # Prevents issues when the agent store in memory the index of an element, scroll, and then try to interact with the wrong index
        "Do never store any index in your memory. Elements' indexes are not stable, they can change as you scroll the page.",
        # Prevents issues when the agent do not have the right element it needs to interact with, and press a random button
        "If you do not have the right element you need to interact with in your list of interactive elements, scroll to find it.",
    ]

    agent_params = {
        "task": param.prompt,
        "llm": kwargs.get(
            "llm",
            ChatOpenAI(
                model="gpt-4.1",
                temperature=0.0,
                timeout=120,
                frequency_penalty=0.3,
            ),
        ),
        "use_vision": kwargs.get("use_vision", False),
        "enable_memory": kwargs.get("enable_memory", False),
        "initial_actions": [
            {"go_to_url": {"url": param.url}},
            {
                "go_to_url": {"url": param.url}
            },  # necessary to do it twice in some situations (i.e tickpick in-url auth in dev)
            {"wait": {"seconds": 5}},
        ],
        "sensitive_data": param.sensitive_data,
        "browser_context": param.context,
        "controller": param.controller,
        "max_actions_per_step": 1,
        "injected_agent_state": kwargs.get("injected_agent_state", None),
        # as long as we're using browser-use==0.41, please keep the space before the "Do never" as browser-use doesn't add it
        "message_context": " "
        + "".join(["\n- " + rule for rule in rules_for_message_context]),
    }

    return Agent(**(agent_params))  # after try use vision (both for planner and agent)
