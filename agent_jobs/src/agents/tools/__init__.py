from typing import Callable
from inspect import getfullargspec

from .generate_uuid import generate_uuid
from .generate_email_address import generate_random_email_address
from .generate_password import generate_password
from .generate_credit_card import generate_credit_card


TOOLS = [
    generate_uuid,
    # generate_plus_addressing_email_address,  #  afaik generate_random_email_address is enough
    generate_random_email_address,
    generate_password,
    generate_credit_card,
]


TOOL_DESCRIPTION = """
<tool>
<name>{name}</name>
<description>
{description}
</description>
<parameters>
{parameters}
</parameters>
</tool>
"""


def _get_tool_description(tool: Callable) -> str:
    spec = getfullargspec(tool)
    parameters = "\n".join([f"- {name}: {spec.annotations[name]}" for name in spec.args])
    return TOOL_DESCRIPTION.format(name=tool.__name__, description=tool.__doc__, parameters=parameters)


def get_prompt_list_of_tools(tools: list[Callable]) -> str:
    return "<tools>\n" + "\n".join([_get_tool_description(tool) for tool in tools]) + "\n</tools>"


__all__ = ["TOOLS", "get_prompt_list_of_tools"]
