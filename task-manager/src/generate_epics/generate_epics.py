import os
import json
import re

from uuid import uuid4
from typing import Any, Optional
from pydantic import SecretStr
from logging import getLogger
from tempfile import NamedTemporaryFile
from langchain_openai import AzureChatOpenAI
from browser_use import Agent, Browser, BrowserConfig
from fixtures.authentification.get_auth_session import get_auth_session
from utils.dto import Product, Epic
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from fastapi import APIRouter, BackgroundTasks, HTTPException
from utils.crypto import crypto_service
from utils.task_status import task_status_manager, handle_background_task_errors
from generate_page_type.generate_page_type import analyze_page_type, get_marketing_page_error_message, PageType
from utils.history_validator import validate_agent_history
from utils.s3_utils import upload_file_to_s3
from utils.constants import AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY


PROMPT = """
You are an AI assistant acting as a product owner. Your task is to explore the provided product and identify all the epics that would be needed to fully implement this product.

First, review the following information:

== Product ==
Project: {product.name}
URL: {product.url}
Description: {product.description}

From the description, if the user tells to login or sign up, ignore it, you are already logged in.

Analyze the provided information carefully and explore the product to identify meaningful epics.
An epic is a large body of work that can be broken down into features. Think of epics as major product sections or significant capabilities.

For each epic, provide a descriptive name and detailed description explaining what this epic encompasses.

Some extra ground rules:
- Make sure each epic is distinct and focused on a specific area of functionality
- Don't create epics that are too granular (those would be features)
- Do not logout from the application when exploring
- Do not exit from the application when exploring

On your final response, for each epic, you should write the following information in the following format:
<epic>
<name>
content of the name
</name>
<description>
content of the description
</description>
</epic>
...
""".strip()


LLM_CLIENT = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_key=SecretStr(AZURE_OPENAI_KEY),
    temperature=0.0,
)


router = APIRouter(prefix="/generate-epics")
logger = getLogger(__name__)


def _parse_epics(epics_text: str) -> list[dict[str, str]]:
    """Parse the text returned from LLM into a list of epic dictionaries."""
    # Use regex to extract epics
    epics = []
    pattern = r'<epic>\s*<name>(.*?)</name>\s*<description>(.*?)</description>\s*</epic>'

    matches = re.finditer(pattern, epics_text, re.DOTALL)

    for match in matches:
        epic = {
            'name': match.group(1).strip(),
            'description': match.group(2).strip(),
        }
        epics.append(epic)

    return epics


async def _generate_epics(
    task_id: str,
    product: Product,
    cookies_file: str | None = None,
    localStorage: str | None = None,
    gif_output_path: str | bool = False,
) -> list[Epic]:
    """
    Generate epics for a product.

    Args:
        product: Product information
        cookies_file: Path to cookies file for browser automation
        localStorage: Path to localStorage file for browser automation
        gif_output_path: Path to store GIF output of browser automation

    Returns:
        List of generated epics
    """

    # Configure the browser session with cookies and localStorage
    browser_config = BrowserConfig(
        headless=os.getenv("HEADLESS", "true").lower() == "true",
    )

    browser = Browser(browser_config)
    context = BrowserContext(browser=browser, config=BrowserContextConfig(
        cookies_file=cookies_file,
        minimum_wait_page_load_time=1,
        viewport_expansion=0,
    ))

    # Initial navigation to the product URL
    await context.navigate_to(product.url)

    if localStorage is not None:
        load_script = """
        (storage => {
            let errors = [];
            Object.keys(storage).forEach(key => {
                try {
                    localStorage.setItem(key, storage[key]);
                } catch (error) {
                    errors.push(`Error setting localStorage key ${key}: ${error.message}`);
                    // Continue with the next key
                }
            });
            return {
                length: localStorage.length,
                errors: errors
            };
        })(%s)
        """.strip() % json.dumps(localStorage)
        result = await context.execute_javascript(load_script)

        # Log any errors in Python
        for error in result['errors']:
            logger.error(f"[{task_id}] {error}")

    if gif_output_path:
        os.makedirs(os.path.dirname(gif_output_path), exist_ok=True)

    # Create agent with the prompt and browser context
    agent = Agent(
        task=PROMPT.format(
            product=product,
        ),
        llm=LLM_CLIENT,
        initial_actions=[{'go_to_url': {'url': product.url}}, {'go_to_url': {'url': product.url}}],
        browser_context=context,
        use_vision=False,
        use_vision_for_planner=False,
        enable_memory=False,
    )

    try:
        history = await agent.run(max_steps=30)
    finally:
        await context.close()
        await browser.close()

    from browser_use.agent.gif import create_history_gif  # import here to avoid thread blocking
    with NamedTemporaryFile(suffix='.gif', delete=True) as temp_gif:
        create_history_gif(
            task="a",
            history=history,
            output_path=temp_gif.name,
            show_task=False,
            show_logo=False,
            show_goals=False
        )

        # Upload GIF to S3
        s3_url = upload_file_to_s3(
            task_id=task_id,
            file_path=temp_gif.name,
            task_type="epic",
            task_name=product.name,
            additional_params=product.model_dump(),
            extension="gif",
            content_type="image/gif",
        )
        if s3_url:
            logger.info(f"[{task_id}] Epics GIF uploaded to S3: {s3_url}")

    result = await validate_agent_history(
        task_id=task_id,
        history=history,
        task_name=f"generate epics for {product.name}",
    )

    # Parse the epics from the LLM response
    epics = _parse_epics(result)

    return [Epic(name=e['name'], description=e['description']) for e in epics]


@handle_background_task_errors
async def background_generate_epics(
    task_id: str,
    product: Product,
    secrets: dict[str, dict[str, str]],
    gif_output_path: str | bool = False,
) -> list[Epic]:
    """
    Background task to generate epics for a product.

    Args:
        task_id: Task ID for tracking
        product: Product information
        secrets: Dictionary of secrets for authentication
        gif_output_path: Path to store GIF output of browser automation

    Returns:
        List of generated epics
    """

    # First, analyze the page type
    page_type = await analyze_page_type(
        task_id=task_id,
        product=product,
    )

    if page_type == PageType.MARKETING:
        raise Exception(get_marketing_page_error_message(task_id))

    auth_session = await get_auth_session(
        task_id=task_id,
        url=product.url,
        secrets=secrets,
    )

    with NamedTemporaryFile(suffix=".json", mode="w+") as cookies_file:
        cookies_file.write(json.dumps(auth_session['cookies']))
        cookies_file.flush()
        cookies_file.seek(0)

        epics = await _generate_epics(
            task_id=task_id,
            product=product,
            cookies_file=cookies_file.name if auth_session.get('cookies') is not None else None,
            localStorage=auth_session.get('localStorage'),
            gif_output_path=gif_output_path,
        )

    return epics


@router.post("/")
async def generate_epics(
    product: Product,
    background_task: BackgroundTasks,
    encrypted_secrets: Optional[dict[str, dict[str, str]]] = None,
) -> str:
    """
    Endpoint to generate epics for a product.

    Args:
        product: Product information
        background_task: Background tasks handler
        encrypted_secrets: Dictionary of encrypted secrets for authentication

    Returns:
        Task ID for tracking the epic generation process
    """
    task_id = str(uuid4())

    secrets_to_use = None

    if encrypted_secrets:
        try:
            secrets_to_use = crypto_service.decrypt_secrets(encrypted_secrets)
            if not secrets_to_use:
                raise HTTPException(status_code=400, detail="No secrets provided")
        except Exception as e:
            logger.error(f"[{task_id}] Failed to decrypt secrets: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to decrypt secrets: {str(e)}")

    background_task.add_task(
        background_generate_epics,
        task_id=task_id,
        product=product,
        secrets=secrets_to_use or {},
        gif_output_path="/tmp",
    )

    return task_id


@router.get("/status/{task_id}")
async def get_epics_generation_status(
    task_id: str,
) -> dict[str, Any]:
    """
    Get the status of an epics generation task.

    Args:
        task_id: Task ID to check

    Returns:
        Dictionary with task status information
    """
    status = task_status_manager.get_status(task_id)
    return status
