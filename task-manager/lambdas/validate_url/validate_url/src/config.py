import os
from typing import TypedDict


class Config(TypedDict):
    headless: bool
    openai_api_key: str


def parse_string_from_env(name: str, required: bool = True) -> str:
    """
    Parse a string value from an environment variable.

    Args:
        name (str): The name of the environment variable.
        required (bool): Whether the value is required. If True, an exception will be raised if the value is not a valid boolean.

    Returns:
        str: The parsed string value or None by default.

    Raises:
        Exception: If the value is not a valid string and required is True.
    """
    value = os.getenv(name)
    if value is None and required:
        raise Exception(f"Invalid value for {name}: Must be a string, not {value}")

    if value is None:
        return ""

    return value


def parse_bool_from_env(name: str, required: bool = True) -> bool:
    """
    Parse a boolean value from an environment variable.

    Args:
        name (str): The name of the environment variable.
        value (str): The value of the environment variable.
        required (bool): Whether the value is required. If True, an exception will be raised if the value is not a valid boolean.

    Returns:
        bool: The parsed boolean value or False by default.

    Raises:
        Exception: If the value is not a valid boolean and required is True.
    """
    value = os.getenv(name)
    if value is None and required:
        raise Exception(
            f"Invalid value for {name}: Must be either 'true' or 'false', not {value}"
        )

    if value is None:
        return False

    if value.lower() == "true":
        return True
    elif value.lower() == "false":
        return False

    raise Exception(
        f"Invalid value for {name}: Must be either 'true' or 'false', not {value}"
    )


def get_config() -> Config:
    """
    Parse configuration from environment variables.

    Returns:
        Config: The parsed configuration.
    """
    return {
        "headless": parse_bool_from_env("HEADLESS", False),
        "openai_api_key": parse_string_from_env("OPENAI_API_KEY", True),
    }
