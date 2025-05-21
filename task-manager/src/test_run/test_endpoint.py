import json

from lmnr import Laminar
from hashlib import md5
from lmnr import observe
from logging import getLogger
from typing import Optional, Any
from utils.dto import Test, Product
from crypto.crypto import crypto_service
from test_run.agent_selection import select_and_call_agent
from fixtures.authentification.get_auth_session import get_auth_session


logger = getLogger(__name__)


@observe()
async def run_test(
    ctx: dict[Any, Any],
    product: dict[str, Any],  # used to get the login url
    feature: dict[str, Any],
    test: dict[str, Any],
    run_without_cache: bool = False,
    secrets: Optional[list[dict[str, Any]]] = None,
) -> dict[str, Any]:

    product_obj: Product = Product(**product)
    test_obj: Test = Test(**test)
    decrypted_secrets: list[dict[str, Any]] = list()

    Laminar.set_session(session_id=ctx['job_id'])
    Laminar.set_metadata({"task_id": ctx['job_id'], "job": run_test.__name__})

    if secrets:
        decrypted_secrets = crypto_service.decrypt_secrets(secrets)

    identifier = md5(json.dumps({
        "product": product,
        "test": test,
        "feature": feature,
        "decrypted_secrets": decrypted_secrets,  # TODO (later): should be based only on the used secrets
    }).encode()).hexdigest()

    auth_session = dict()
    if test_obj.access_conditions and test_obj.access_conditions.get("must_be_logged_in") is True:
        auth_session = await get_auth_session(
            identifier=None,
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
        run_without_cache=run_without_cache,
    )

    result["tracing"] = {}  # deactivated for now

    logger.info(f"[{ctx['job_id']}] Ran tests for {test_obj.url}")

    return result
