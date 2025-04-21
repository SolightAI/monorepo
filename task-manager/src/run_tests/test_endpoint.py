from typing import Any, Optional
from pydantic import SecretStr
from logging import getLogger
from langchain_openai import AzureChatOpenAI
from fixtures.authentification.get_auth_session import get_auth_session
from run_tests.router import select_and_call_agent
from utils.dto import Test
from fastapi import APIRouter, BackgroundTasks, HTTPException, Body
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
async def background_run_test(task_id: str, test: Test, secrets: dict[str, str]) -> None:
    """
    Run a test in the background.

    Args:
        task_id: The ID of the task.
        test: The test to run.
        secrets: The secrets to use for the test.
    """
    try:
        # Set status to running
        await task_status_manager.set_status(
            task_id=task_id,
            status="running",
            results=None,
        )

        # Convert secrets to the expected format
        formatted_secrets = {}
        for category, value in secrets.items():
            if isinstance(value, dict):
                formatted_secrets[category] = value
            else:
                formatted_secrets[category] = {"value": value}

        logger.info(f"[{task_id}] Starting test execution for {test.name}")
        logger.info(f"[{task_id}] Test URL: {test.url}")
        logger.info(f"[{task_id}] Test category: {test.category}")

        # Run the test using select_and_call_agent
        result = await select_and_call_agent(
            task_id=task_id,
            test=test,
            secrets=formatted_secrets,
            auth_session={},  # Empty auth session as default
        )

        logger.info(f"[{task_id}] Test execution completed with status: {result.get('status', 'unknown')}")

        # Set status to completed
        await task_status_manager.set_status(
            task_id=task_id,
            status=result.get('status', 'error'),
            results=result.get('results', None),
            agent_thoughts=result.get('agent_thoughts', None),
            agent_actions=result.get('agent_actions', None),
            evidence=result.get('evidence', None),
            error=result.get('error', None),
        )
    except Exception as e:
        logger.error(f"[{task_id}] Error in background task: {str(e)}")
        # Set status to error
        await task_status_manager.set_status(
            task_id=task_id,
            status="error",
            error=str(e),
        )
        raise


@router.post("/run-test")
async def run_test(
    test: Test,
    background_task: BackgroundTasks,
    task_id: str = Body(..., embed=True),
    encrypted_secrets: Optional[dict[str, dict[str, str]]] = None,
) -> str:

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

    await task_status_manager.set_status(
        task_id=task_id,
        status="pending",
        results=None,
    )

    return task_id


@router.get("/status/{task_id}")
async def get_test_run_status(
    task_id: str,
) -> dict[str, Any]:

    status = await task_status_manager.get_status(task_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Task not found")

    return status
