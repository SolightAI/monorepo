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
from utils.dto import Product, Epic, Feature
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from fastapi import APIRouter, BackgroundTasks, HTTPException
from utils.crypto import crypto_service
from utils.task_status import task_status_manager, handle_background_task_errors
from utils.history_validator import validate_agent_history
from utils.s3_utils import upload_file_to_s3
from utils.constants import AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY


PROMPT = """
You are an AI assistant acting as a product owner. Your task is to explore the provided product and to write all the features that you are present inside the provided epic.

First, review the following information:

== Product ==
Project: {product.name}
URL: {product.url}
Description: {product.description}

== Epic ==
Name: {epic.name}
Description: {epic.description}

Analyze the provided information carefully and explore the product to find all the features that are present inside the epic.
Once done, write for each feature present inside the epic the name and the description of the feature.

Some extra ground rules:
- Note that a feature can be present on multiple part of the product, for each place where the feature is present, you should write the url of the page (the full url, not just the path)
- You first need to locate the epic on the product, then you can start discovering the features.
- While looking for the epic, make sure to not leave to the marketing website. Web app and marketing website can sometimes share the same domain, they remain nonetheless different.
- If you cannot locate the epic on the product, stop by raising an exception to the user
- Do not logout from the application when generating the features
- Do not exit from the application when generating the features
- If you need to login, stop by raising an exception to the user

On your final response, for each feature, you should write the following informations in the following format:
<feature>
<name>
content of the name
</name>
<description>
content of the description
</description>
<urls>
<url>
url where the feature is
</url>
...
</urls>

</feature>
...
""".strip()


LLM_CLIENT = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_key=SecretStr(AZURE_OPENAI_KEY),
    temperature=0.0,
)


router = APIRouter(prefix="/generate-features")
logger = getLogger(__name__)


def _parse_features(task_id: str, features_text: str) -> list[dict[str, str]]:
    """Parse the text returned from LLM into a list of feature dictionaries."""
    # Use regex to extract features
    features = []
    pattern = r'<feature>\s*<name>(.*?)</name>\s*<description>(.*?)</description>\s*<urls>(.*?)</urls>\s*</feature>'

    matches = re.finditer(pattern, features_text, re.DOTALL)

    for match in matches:

        urls = match.group(3).strip()
        pattern = r'<url>(.*?)</url>'
        urls = re.findall(pattern, urls, re.DOTALL)

        if not urls:
            raise Exception(f"[{task_id}] No urls found for feature {match.group(3).strip()}")

        feature = {
            'name': match.group(1).strip(),
            'description': match.group(2).strip(),
            'urls': urls,
        }
        features.append(feature)

    return features


async def _generate_features(
    task_id: str,
    product: Product,
    epic: Epic,
    cookies_file: str | None = None,
    localStorage: str | None = None,
    gif_output_path: str | bool = False,
) -> list[Feature]:
    """
    Generate features for an epic.

    Args:
        product: Product information
        epic: Epic information
        cookies_file: Path to cookies file for browser automation
        localStorage: Path to localStorage file for browser automation
        gif_output_path: Path to store GIF output of browser automation

    Returns:
        List of generated features
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

    # TODO: not only on the first url, but on all the urls
    await context.navigate_to(product.url)  # allowing us to load the localStorage

    if localStorage is not None:
        load_script = """
        (storage => {
            Object.keys(storage).forEach(key => {
                localStorage.setItem(key, storage[key]);
            });
            return localStorage.length;
        })(%s)
        """.strip() % json.dumps(localStorage)
        await context.execute_javascript(load_script)

    if gif_output_path:
        os.makedirs(os.path.dirname(gif_output_path), exist_ok=True)

    # NOTE: we do not provide a controller as models tend to provide better results when not constrained by a controller output model
    agent = Agent(
        task=PROMPT.format(
            product=product,
            epic=epic,
        ),
        llm=LLM_CLIENT,
        initial_actions=[{'go_to_url': {'url': product.url}}, {'go_to_url': {'url': product.url}}],
        browser_context=context,
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
            task_type="feature",
            task_name=epic.name,
            additional_params=epic.model_dump(),
            extension="gif",
            content_type="image/gif",
        )
        if s3_url:
            logger.info(f"[{task_id}] Features GIF uploaded to S3: {s3_url}")

    result = await validate_agent_history(
        task_id=task_id,
        history=history,
        task_name=f"generate features for {epic.name}",
    )

    # Parse the test cases from the LLM response
    features = _parse_features(task_id, result)

    return [Feature(name=f['name'], description=f['description'], urls=f['urls']) for f in features]


@handle_background_task_errors
async def background_generate_features(
    task_id: str,
    product: Product,
    epic: Epic,
    secrets: dict[str, dict[str, str]],
    gif_output_path: str | bool = False,
) -> list[Feature]:
    """
    Background task to generate features for an epic.

    Args:
        task_id: Task ID for tracking
        product: Product information
        epic: Epic information
        feature: Feature information
        secrets: Dictionary of secrets for authentication
        gif_output_path: Path to store GIF output of browser automation

    Returns:
        List of generated features
    """

    auth_session = await get_auth_session(
        task_id=task_id,
        url=product.url,
        secrets=secrets,
    )

    with NamedTemporaryFile(suffix=".json", mode="w+") as cookies_file:
        cookies_file.write(json.dumps(auth_session['cookies']))
        cookies_file.flush()
        cookies_file.seek(0)

        features = await _generate_features(
            task_id=task_id,
            product=product,
            epic=epic,
            cookies_file=cookies_file.name if auth_session.get('cookies') is not None else None,
            localStorage=auth_session.get('localStorage'),
            gif_output_path=gif_output_path,
        )

    return features


@router.post("/")
async def generate_features(
    product: Product,
    epic: Epic,
    background_task: BackgroundTasks,
    encrypted_secrets: Optional[dict[str, dict[str, str]]] = None,
) -> str:
    """
    Endpoint to generate features for an epic.

    Args:
        product: Product information
        epic: Epic information
        background_task: Background tasks handler
        secrets: Dictionary of secrets for authentication
        encrypted_secrets: Dictionary of encrypted secrets for authentication

    Returns:
        Task ID for tracking the test generation process
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
        background_generate_features,
        task_id=task_id,
        product=product,
        epic=epic,
        secrets=secrets_to_use or {},
        gif_output_path="/tmp",
    )

    return task_id


@router.get("/status/{task_id}")
async def get_features_generation_status(
    task_id: str,
) -> dict[str, Any]:
    """
    Get the status of a features generation task.

    Args:
        task_id: Task ID to check

    Returns:
        Dictionary with task status information
    """
    status = task_status_manager.get_status(task_id)
    return status


# TODO: Test both w/ and w/o the browser-use to see what leads to better results
# TODO: give access to doc RAD so the agent can ask questions about the product
