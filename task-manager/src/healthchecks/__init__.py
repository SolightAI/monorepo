from inspect import getfullargspec
from typing import Callable
from healthchecks.get_login_status import get_login_status


HEALTHCHECKS = [
    get_login_status,
]


HEALTHCHECK_DESCRIPTION = """
<healthcheck>
<name>{name}</name>
<description>
{description}
</description>
<parameters>
{parameters}
</parameters>
</healthcheck>
"""


def get_healthcheck_description(healthcheck: Callable) -> str:
    spec = getfullargspec(healthcheck)
    parameters = "".join([f"\n- {name}: {spec.annotations[name]}" for name in spec.args])
    return HEALTHCHECK_DESCRIPTION.format(name=healthcheck.__name__, description=healthcheck.__doc__, parameters=parameters)


def get_prompt_list_of_healthchecks() -> str:
    return "<healthchecks>\n" + "\n".join([get_healthcheck_description(healthcheck) for healthcheck in HEALTHCHECKS]) + "\n</healthchecks>"


__all__ = [
    "get_prompt_list_of_healthchecks",
    "HEALTHCHECKS",
]
