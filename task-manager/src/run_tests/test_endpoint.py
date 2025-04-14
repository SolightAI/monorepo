import json

from uuid import uuid4
from typing import Any, Optional
from pydantic import SecretStr
from logging import getLogger
from tempfile import NamedTemporaryFile
from langchain_openai import AzureChatOpenAI
from fixtures.authentification.get_auth_session import get_auth_session
from run_tests.router import select_and_call_agent
from utils.dto import Test
from fastapi import APIRouter, BackgroundTasks, HTTPException
from utils.crypto import crypto_service
from utils.task_status import task_status_manager, handle_background_task_errors
from utils.constants import AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY


LLM_CLIENT = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_key=SecretStr(AZURE_OPENAI_KEY),
    temperature=0.0,
)


router = APIRouter(prefix="/run-test")
logger = getLogger(__name__)


@handle_background_task_errors
async def background_run_test(
    task_id: str,
    test: Test,
    secrets: dict[str, dict[str, str]],
) -> dict[str, Any]:

    auth_session = dict()
    try:
        if test.access_conditions.get("must_be_logged_in") is True:
            auth_session = await get_auth_session(
                task_id=task_id,
                url=test.url,
                secrets=secrets,
            )
    except Exception as e:
        logger.error(f"[{task_id}] Error in background task: {e}")
        raise e

    logger.info(f"[{task_id}] Generated cookies for {test.url}")

    with NamedTemporaryFile(delete=True, suffix='.json', mode='w+') as f:
        if auth_session.get('cookies') is not None:
            json.dump(auth_session['cookies'], f)
            f.flush()
            f.seek(0)

        logger.info(f"[{task_id}] Running test {test.name} for {test.url}")
        result = await select_and_call_agent(
            task_id=task_id,
            test=test,
            secrets=secrets,
        )

        logger.info(f"[{task_id}] Ran tests for {test.url}")

    task_status_manager.set_status(
        task_id=task_id,
        status=result['status'],
        results=result.get('results', None),
        error=result.get('error', None),
        agent_thoughts=result.get('agent_thoughts', None),
        agent_actions=result.get('agent_actions', None),
        tracing=result.get('tracing', None),
    )

    return result


@router.post("/run-test")
async def run_test(
    test: Test,
    background_task: BackgroundTasks,
    encrypted_secrets: Optional[dict[str, dict[str, str]]] = None,
) -> str:

    task_id = str(uuid4())

    # Decrypt encrypted secrets if provided
    secrets = {}
    if encrypted_secrets:
        try:
            # Decrypt the secrets
            secrets = crypto_service.decrypt_secrets(encrypted_secrets)
            logger.info(f"[{task_id}] Successfully decrypted secrets")
        except Exception as e:
            logger.error(f"[{task_id}] Failed to decrypt secrets: {str(e)}")
            raise HTTPException(status_code=400, detail="Failed to decrypt secrets")

    background_task.add_task(
        background_run_test,
        task_id=task_id,
        test=test,
        secrets=secrets,
    )

    task_status_manager.set_status(
        task_id=task_id,
        status="pending",
        results=None,
    )

    return task_id


@router.get("/status/{task_id}")
async def get_test_run_status(
    task_id: str,
) -> dict[str, Any]:

    if task_status_manager.get_status(task_id) is None:
        raise HTTPException(status_code=404, detail="Task not found")

    return task_status_manager.get_status(task_id)
