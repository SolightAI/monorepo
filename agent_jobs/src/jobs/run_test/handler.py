import json
import logging

from typing import Any, Optional
from hashlib import md5

from src.config import Config
from src.common.dto import Product, Feature, Test

from src.agents.auth.get_auth_session import get_auth_session

from .agent import run


logger = logging.getLogger(__name__)


async def handler(
    config: Config,
    job_id: str,
    product: Product,
    feature: Feature,
    test: Test,
    secrets: Optional[list[dict[str, Any]]],
    run_without_cache: bool | None = None,
) -> Any:  # TODO(TomChv): This should be a RunTestResult
    decrypted_secrets: list[dict[str, Any]] = list()

    if secrets:
        decrypted_secrets = config.crypto.decrypt_secrets(secrets)

    identifier = md5(
        json.dumps(
            {
                "product": product,
                "test": test,
                "feature": feature,
                "decrypted_secrets": decrypted_secrets,  # TODO (later): should be based only on the used secrets
            }
        ).encode()
    ).hexdigest()

    auth_session = dict()
    if (
        test.access_conditions
        and test.access_conditions.get("must_be_logged_in") is True
    ):
        auth_session = await get_auth_session(
            config=config,
            identifier=identifier,
            task_id=job_id,
            url=product.url,
            secrets=decrypted_secrets,
        )

    logger.info(f"[{job_id}] Running test {test.name} for {test.url}")

    result = await run(
        config=config,
        identifier=identifier,
        task_id=job_id,
        test=test,
        secrets=decrypted_secrets,
        auth_session=auth_session,
        run_without_cache=run_without_cache is False,
    )

    result["tracing"] = {}  # deactivated for now

    logger.info(f"[{job_id}] Ran tests for {test.url}")
    logger.info(f"[{job_id}] Test ran successfully")

    return result
