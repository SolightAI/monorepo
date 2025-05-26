import logging

from typing import Any, Optional

from .dto import ImproveTestStepsResult
from src.common.dto import Product, Test
from src.config import Config

from src.agents.auth.get_auth_session import get_auth_session

from .agent import run

logger = logging.getLogger(__name__)


async def handler(
    config: Config,
    job_id: str,
    product: Product,
    test: Test,
    secrets: Optional[list[dict[str, Any]]] = None,
) -> ImproveTestStepsResult:
    decrypted_secrets: list[dict[str, Any]] = list()

    if secrets:
        decrypted_secrets = config.crypto.decrypt_secrets(secrets)

    auth_session = dict()
    if (
        test.access_conditions
        and test.access_conditions.get("must_be_logged_in") is True
    ):
        auth_session = await get_auth_session(
            config=config,
            task_id=job_id,
            url=product.url,
            secrets=decrypted_secrets,
        )

    logger.info(f"[{job_id}] Running test {test.name} for {test.url}")

    result = await run(
        config=config,
        task_id=job_id,
        test=test,
        secrets=secrets or [],
        auth_session=auth_session,
    )

    logger.info(f"[{job_id}] Test {test.name} finished running: {result}")

    return result
