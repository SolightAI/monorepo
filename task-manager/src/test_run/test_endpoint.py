from utils.dto import Test
from typing import Optional, Any
from logging import getLogger
from crypto.crypto import crypto_service
from test_run.agent_selection import select_and_call_agent
from fixtures.authentification.get_auth_session import get_auth_session


logger = getLogger(__name__)


async def run_test(
    ctx: dict[Any, Any],
    test: Test,
    secrets: Optional[dict[str, dict[str, str]]] = None,
) -> str:

    test = Test(**test)
    decrypted_secrets = {}

    if secrets:
        decrypted_secrets = crypto_service.decrypt_secrets(secrets)

    auth_session = dict()
    if test.access_conditions.get("must_be_logged_in") is True:
        auth_session = await get_auth_session(
            task_id=ctx['job_id'],
            url=test.url,
            secrets=decrypted_secrets,
        )

    logger.info(f"[{ctx['job_id']}] Running test {test.name} for {test.url}")

    result = await select_and_call_agent(
        task_id=ctx['job_id'],
        test=test,
        secrets=decrypted_secrets,
        auth_session=auth_session,
    )

    logger.info(f"[{ctx['job_id']}] Ran tests for {test.url}")

    return result
