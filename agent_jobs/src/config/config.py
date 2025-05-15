from pydantic import BaseModel

from src.common import env, webhook_client, s3_client, crypto


class Config(BaseModel):
    """Configuration for the agent runner.

    Attributes:
      headless (bool): Whether to run the agent in headless mode.
      openai_api_key (str): The OpenAI API key to use for the agent.
      webhook_client (WebhookSender): The webhook sender to use for sending the agent's results.
      s3_client (S3Client): The S3 client to use for uploading files.
      twocapcha_api_key (str): The Twocaptcha API key to use for the agent.
    """

    headless: bool
    openai_api_key: str
    webhook_client: webhook_client.WebhookClient
    s3_client: s3_client.S3Client
    twocaptcha_api_key: str
    crypto: crypto.CryptoService


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
            s3_client=s3_client.S3Client(
                env.get_string("S3_ACCESS_KEY_ID"),
                env.get_string("S3_SECRET_ACCESS_KEY"),
                env.get_string("S3_BUCKET_NAME"),
                env.get_string("S3_BUCKET_ENDPOINT_URL"),
                env.get_string("S3_REGION", "us-east-1"),
            ),
            twocaptcha_api_key=env.get_string("TWOCAPTCHA_API_KEY"),
            crypto=crypto.CryptoService(env.get_string("SYMMETRIC_ENCRYPTION_KEY")),
        )
    except Exception as e:
        raise ConfigError(f"Failed to get configuration: {e}")
