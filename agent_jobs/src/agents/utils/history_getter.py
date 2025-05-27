from typing import Any

from browser_use import AgentHistoryList


def get_agent_thoughts(history: AgentHistoryList) -> list[dict[str, Any]]:
    return [thought.model_dump() for thought in history.model_thoughts()]


def get_agent_actions(history: AgentHistoryList) -> list[dict[str, Any]]:
    return [
        _action
        | {
            "interacted_element": _action["interacted_element"].to_dict()
            if _action["interacted_element"]
            else None
        }
        for _action in history.model_actions()
    ]
