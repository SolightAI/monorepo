import logging

from lmnr import Laminar

from src.common import env
from src.common.webhook_client import WebhookClient
from src.common.s3_client import S3Client
from src.common.crypto import CryptoService
from src.common.redis_client import RedisClient

logger = logging.getLogger(__name__)


class Config:
    """Configuration for the agent runner.

    Attributes:
      headless (bool): Whether to run the agent in headless mode.
      openai_api_key (str): The OpenAI API key to use for the agent.
      webhook_client (WebhookSender): The webhook sender to use for sending the agent's results.
      s3_client (S3Client): The S3 client to use for uploading files.
      twocapcha_api_key (str): The Twocaptcha API key to use for the agent.
      crypto (CryptoService): The crypto service to use for encrypting secrets.
      redis (RedisClient): The Redis client to use for caching.
    """

    headless: bool
    openai_api_key: str
    webhook_client: WebhookClient
    s3_client: S3Client
    twocaptcha_api_key: str
    crypto: CryptoService
    redis: RedisClient

    def __init__(
        self,
        headless: bool,
        openai_api_key: str,
        webhook_client: WebhookClient,
        s3_client: S3Client,
        twocaptcha_api_key: str,
        crypto: CryptoService,
        redis: RedisClient,
    ) -> None:
        self.headless = headless
        self.openai_api_key = openai_api_key
        self.webhook_client = webhook_client
        self.s3_client = s3_client
        self.twocaptcha_api_key = twocaptcha_api_key
        self.crypto = crypto
        self.redis = redis


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
        # Check for the LAMINAR_API_KEY environment variable
        laminar_api_key = env.get_string("LAMINAR_API_KEY", required=False)
        if laminar_api_key is None:
            logger.warning(
                "LMNR_PROJECT_API_KEY env var not found, telemetry will be disabled."
            )
        else:
            Laminar.initialize(project_api_key=laminar_api_key)

        return Config(
            headless=env.get_bool("HEADLESS", False),
            openai_api_key=env.get_string("OPENAI_API_KEY"),
            webhook_client=WebhookClient(env.get_string("WEBHOOK_URL")),
            s3_client=S3Client(
                env.get_string("S3_ACCESS_KEY_ID"),
                env.get_string("S3_SECRET_ACCESS_KEY"),
                env.get_string("S3_BUCKET_NAME"),
                env.get_string("S3_BUCKET_ENDPOINT_URL"),
                env.get_string("S3_REGION", "us-east-1"),
            ),
            twocaptcha_api_key=env.get_string("TWOCAPTCHA_API_KEY"),
            crypto=CryptoService(env.get_string("SYMMETRIC_ENCRYPTION_KEY")),
            redis=RedisClient(
                env.get_string("REDIS_HOST"),
                env.get_int("REDIS_PORT"),
                env.get_int("REDIS_DB", 0),
                env.get_string("REDIS_PASSWORD", required=False),
            ),
        )
    except Exception as e:
        raise ConfigError(f"Failed to get configuration: {e}")
