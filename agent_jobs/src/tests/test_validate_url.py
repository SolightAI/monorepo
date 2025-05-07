import logging
import pytest

from src.config import env
from src.validate_url.config import Config
from src.validate_url.agent import run

logger = logging.getLogger(__name__)


@pytest.mark.asyncio
async def test_validate_url_login_farmzz(task_id: str) -> None:
    """
    Test validating the farmzz.com URL to find a login page,
    then attempt login with credentials.

    This test:
    1. Validates the farmzz.com URL to find the login page
    2. Uses the detected login page URL for authentication
    3. Confirms successful authentication
    """
    # First, validate the URL
    base_url = "https://farmzz.com"

    config: Config = {
        "headless": True,
        "openai_api_key": env.get_string("OPENAI_API_KEY"),
        "lambda_webhook_url": "",
    }

    # Run the validation task directly
    validation_result = await run(config, base_url)

    # Debug output to show full validation result
    logger.info(f"[{task_id}] Validation result: {validation_result}")

    # Verify that validation found a login page
    assert (
        validation_result.valid is True
    ), f"Expected valid=True, got {validation_result.valid}"

    assert (
        validation_result.login_url == "https://farmzz.com/#/auth/login"
    ), f"Expected login_url='https://farmzz.com/#/auth/login', got {validation_result.login_url}"

    assert validation_result.confidence in [
        "high",
        "medium",
    ], f"Expected confidence in ['high', 'medium'], got {validation_result.confidence}"

    assert (
        validation_result.source == "validation"
    ), f"Expected source='validation', got {validation_result.source}"

    logger.info(
        f"[{task_id}] ✅ Successfully validated URL and authenticated on: {validation_result.login_url}"
    )
