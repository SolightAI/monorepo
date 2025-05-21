import os

from typing import Literal, overload


@overload
def get_int(
    name: str, default: int | None = None, required: Literal[True] = True
) -> int: ...


@overload
def get_int(
    name: str, default: int | None = None, required: Literal[False] = False
) -> int | None: ...


def get_int(name: str, default: int | None = None, required: bool = True) -> int | None:
    """
    Parse an integer value from an environment variable.

    Args:
        name (str): The name of the environment variable.
        default (int | None): The default value to return if the environment
        variable is not set.
        required (bool): Whether the value is required. If True, an exception
        will be raised if the value is missing.

    Returns:
        int: The parsed integer value or None by default.

    Raises:
        Exception: If the value is not set and required is True.
    """
    value = os.getenv(name)
    if value is None and default is None and required:
        raise Exception(f"Missing required environment variable: {name}")

    if value is None and default is not None:
        return default

    if value is None:
        return None

    if value.isdigit() is False:
        raise Exception(f"Invalid value for {name}: Must be an integer, not {value}")

    return int(value)


@overload
def get_string(
    name: str, default: str | None = None, required: Literal[True] = True
) -> str: ...


@overload
def get_string(
    name: str, default: str | None = None, required: Literal[False] = False
) -> str | None: ...


def get_string(
    name: str, default: str | None = None, required: bool = True
) -> str | None:
    """
    Parse a string value from an environment variable.

    Args:
        name (str): The name of the environment variable.
        default (str | None): The default value to return if the environment
        variable is not set.
        required (bool): Whether the value is required. If True, an exception
        will be raised if the value is missing.

    Returns:
        str: The parsed string value or None by default.

    Raises:
        Exception: If the value is not set and required is True.
    """
    value = os.getenv(name)
    if value is None and default is None and required:
        raise Exception(f"Missing required environment variable: {name}")

    if value is None and default is not None:
        return default

    if value is None:
        return None

    return value


@overload
def get_bool(
    name: str, default: bool | None = None, required: Literal[True] = True
) -> bool: ...


@overload
def get_bool(
    name: str, default: bool | None = None, required: Literal[False] = False
) -> bool | None: ...


def get_bool(
    name: str, default: bool | None = None, required: bool = True
) -> bool | None:
    """
    Parse a boolean value from an environment variable.

    Args:
        name (str): The name of the environment variable.
        default (bool | None): The default value to return if the environment
        variable is not set.
        required (bool): Whether the value is required. If True, an exception
        will be raised if the value is missing.

    Returns:
        bool: The parsed boolean value or None by default.

    Raises:
        Exception: If the value is not set and required is True.
    """
    value = os.getenv(name)
    if value is None and default is None and required:
        raise Exception(f"Missing required environment variable: {name}")

    if value is None and default is not None:
        return default

    if value is None:
        return None

    if value.lower() == "true" or value.lower() == "yes" or value == "1":
        return True
    elif value.lower() == "false" or value.lower() == "no" or value == "0":
        return False

    raise Exception(
        f"Invalid value for {name}: Must be either 'true' or 'false', not {value}"
    )
