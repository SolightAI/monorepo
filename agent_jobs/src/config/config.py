from pydantic import BaseModel

from src.common import env, webhook_client


class Config(BaseModel):
    """Configuration for the agent runner.

    Attributes:
      headless (bool): Whether to run the agent in headless mode.
      openai_api_key (str): The OpenAI API key to use for the agent.
      webhook_client (WebhookSender): The webhook sender to use for sending the agent's results.
    """

    headless: bool
    openai_api_key: str
    webhook_client: webhook_client.WebhookClient


class ConfigError(Exception):
    """Error raised when the configuration is invalid."""


def get_config() -> Config:
    """Get the configuration for the agent runner.

    Returns:
        Config: The configuration.

    Raises:
        ConfigError: If the configuration is invalid or incomplete.
    """

    try:
        return Config(
            headless=env.get_bool("HEADLESS", False),
            openai_api_key=env.get_string("OPENAI_API_KEY"),
            webhook_client=webhook_client.WebhookClient(env.get_string("WEBHOOK_URL")),
        )
    except Exception as e:
        raise ConfigError(f"Failed to get configuration: {e}")
