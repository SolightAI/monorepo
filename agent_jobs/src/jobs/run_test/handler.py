import json
import logging

from typing import Any, Optional
from hashlib import md5

from src.config import Config
from src.common.dto import Product, Feature, Test

from src.agents.auth.get_auth_session import get_auth_session

from .agent import run
from .dto import RunTestResult

logger = logging.getLogger(__name__)


async def handler(
    config: Config,
    job_id: str,
    product: Product,
    feature: Feature,
    test: Test,
    secrets: Optional[list[dict[str, Any]]],
    run_without_cache: bool | None = None,
) -> RunTestResult:
    decrypted_secrets: list[dict[str, Any]] = list()

    if secrets:
        decrypted_secrets = config.crypto.decrypt_secrets(secrets)

    identifier = md5(
        json.dumps(
            {
                "product": product.model_dump(),
                "test": test.model_dump(),
                "feature": feature.model_dump(),
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

    result.tracing = {}  # deactivated for now

    logger.info(f"[{job_id}] Tests for {test.url} ran successfully")

    return RunTestResult(
        status=result.status,
        results=result.results,
        evidence=result.evidence,
        is_from_cache=result.is_from_cache,
        error=result.error,
        traceback=result.traceback,
        agent_thoughts=result.agent_thoughts,
        agent_actions=result.agent_actions,
        tracing=result.tracing,
    )
