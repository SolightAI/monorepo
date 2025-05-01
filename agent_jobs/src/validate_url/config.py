from typing import TypedDict

from src.config import env


class Config(TypedDict):
    headless: bool
    openai_api_key: str

def get() -> Config:
    """
    Parse configuration from environment variables.

    Returns:
        Config: The parsed configuration.
    """
    return {
      "headless": env.get_bool("HEADLESS", False),
      "openai_api_key": env.get_string("OPENAI_API_KEY"),
    }