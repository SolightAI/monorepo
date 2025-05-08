import json

from hashlib import md5
from utils.dto import Test, Product
from typing import Optional, Any
from logging import getLogger
from crypto.crypto import crypto_service
from test_run.agent_selection import select_and_call_agent
from fixtures.authentification.get_auth_session import get_auth_session


logger = getLogger(__name__)


async def run_test(
    ctx: dict[Any, Any],
    product: dict[str, Any],  # used to get the login url
    test: dict[str, Any],
    secrets: Optional[list[dict[str, Any]]] = None,
) -> dict[str, Any]:

    product_obj: Product = Product(**product)
    test_obj: Test = Test(**test)
    decrypted_secrets: list[dict[str, Any]] = list()

    if secrets:
        decrypted_secrets = crypto_service.decrypt_secrets(secrets)

    logger.info(f"[{ctx['job_id']}] md5 of product: {md5(json.dumps(product).encode()).hexdigest()}")
    logger.info(f"[{ctx['job_id']}] md5 of test: {md5(json.dumps(test).encode()).hexdigest()}")
    logger.info(f"[{ctx['job_id']}] md5 of secrets: {md5(json.dumps(decrypted_secrets).encode()).hexdigest()}")

    identifier = md5(json.dumps({
        "product": product,
        "test": test,
        # FIXME (later): should also be based on the feature
        "decrypted_secrets": decrypted_secrets,  # FIXME (later): should be based only on the used secrets
    }).encode()).hexdigest()

    auth_session = dict()
    if test_obj.access_conditions and test_obj.access_conditions.get("must_be_logged_in") is True:
        auth_session = await get_auth_session(
            identifier=identifier,
            task_id=ctx['job_id'],
            url=product_obj.url,
            secrets=decrypted_secrets,
        )

    logger.info(f"[{ctx['job_id']}] Running test {test_obj.name} for {test_obj.url}")

    result = await select_and_call_agent(
        identifier=identifier,
        task_id=ctx['job_id'],
        test=test_obj,
        secrets=decrypted_secrets,
        auth_session=auth_session,
    )

    result["tracing"] = {}  # deactivated for now

    logger.info(f"[{ctx['job_id']}] Ran tests for {test_obj.url}")

    return result
