import logging
import json

from typing import Any, Optional

from tempfile import NamedTemporaryFile

from src.common.dto import Product, Feature, Epic, Test, TestCategory, TestStatus
from src.config import Config
from src.agents.auth.get_auth_session import get_auth_session

from .agent import run
from .dto import GeneratedTestResult


logger = logging.getLogger(__name__)


async def handler(
    config: Config,
    job_id: str,
    product: Product,
    epic: Epic,
    feature: Feature,
    secrets: Optional[list[dict[str, Any]]] = None,
    categories: Optional[list[TestCategory]] = None,
) -> GeneratedTestResult:
    logger.info(
        f"[{job_id}] Test generation: {epic.name}/{product.name}/{feature.name}"
    )

    if secrets:
        try:
            decrypted_secrets = config.crypto.decrypt_secrets(secrets)
        except ValueError as e:
            logger.error(f"[{job_id}] Failed to decrypt secrets: {str(e)}")
            # Handle decryption failure, maybe return an error status
            result = {
                "results": [],
                "status": TestStatus.FAILED.value,
                "error": f"Failed to decrypt secrets: {str(e)}",
            }

            config.webhook_client.send_success(job_id, json.dumps(result))

    # No category specified, default to smoke tests
    if categories is None:
        categories = [TestCategory.SMOKE]

    auth_session = dict()
    if (
        feature.access_conditions is not None
        and feature.access_conditions.get("must_be_logged_in") is True
    ):
        auth_session = await get_auth_session(
            config=config,
            task_id=job_id,
            url=product.url,
            secrets=decrypted_secrets,  # Use decrypted secrets here # type: ignore
        )

    generated_tests: list[Test] = []

    with NamedTemporaryFile(suffix=".json", mode="w+") as cookies_file:
        cookies_file.write(json.dumps(auth_session.get("cookies")))
        cookies_file.flush()
        cookies_file.seek(0)

        local_storage_data = auth_session.get("localStorage")
        local_storage_json = (
            json.dumps(local_storage_data) if local_storage_data is not None else None
        )

        for category in categories:
            try:
                tests = await run(
                    job_id=job_id,
                    s3_client=config.s3_client,
                    product=product,
                    epic=epic,
                    feature=feature,
                    test_category=category,
                    headless=config.headless,
                    cookies_file=cookies_file.name
                    if auth_session.get("cookies") is not None
                    else None,
                    local_storage=local_storage_json,
                )

                generated_tests.extend(tests)
            except Exception as e:
                logger.error(f"[{job_id}] Error while generating test: {e}")
                raise e

    result = GeneratedTestResult(
        results=generated_tests,
        status=TestStatus.PASSED,
    )

    logger.info(f"[{job_id}] Test generation output: {result}")

    logger.info(
        f"[{job_id}] Successfully generated tests for {epic.name}/{product.name}/{feature.name}"
    )

    return result
