import os
import json
import re
import functools
import traceback
from uuid import uuid4
from typing import Any, Optional
from pydantic import SecretStr
from logging import getLogger
from tempfile import NamedTemporaryFile
from langchain_openai import AzureChatOpenAI
from browser_use import Agent, Browser, BrowserConfig
from fixtures.generate_auth_session import generate_auth_session
from utils.dto import Product, Epic, Feature
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from fastapi import APIRouter, BackgroundTasks, HTTPException
from utils.crypto import crypto_service
from utils.task_status import task_status_manager


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
- Note that a feature can be present on multiple part of the product, for each place where the feature is present, you should write the url of the page
- You first need to locate the epic on the product, then you can start discovering the features
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


if (azure_openai_key := os.getenv('AZURE_OPENAI_KEY')) is None:
    raise ValueError('AZURE_OPENAI_KEY is not set')

if (azure_openai_endpoint := os.getenv('AZURE_OPENAI_ENDPOINT')) is None:
    raise ValueError('AZURE_OPENAI_ENDPOINT is not set')


LLM_CLIENT = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=azure_openai_endpoint,
    api_key=SecretStr(azure_openai_key),
    temperature=0.0,
)


router = APIRouter(prefix="/generate-features")
logger = getLogger(__name__)


def _parse_features(features_text: str) -> list[dict[str, str]]:
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
            raise Exception(f"No urls found for feature {match.group(3).strip()}")

        feature = {
            'name': match.group(1).strip(),
            'description': match.group(2).strip(),
            'urls': urls,
        }
        features.append(feature)

    return features


async def _generate_features(
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
        chrome_instance_path=os.getenv("CHROME_INSTANCE_PATH", None)
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
        """.strip() % str(localStorage).replace("'", '"')
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
        # generate_gif=gif_output_path,  # deactivated cause it leads to thread blocking
    )

    try:
        history = await agent.run(max_steps=30)
    finally:
        await context.close()
        await browser.close()

    result = history.final_result()
    if history.has_errors() or not history.is_done() or result is None or not history.is_successful():
        raise Exception("Failed to generate features for epic")

    if result is None:
        logger.error("Couldn't generate features for epic %s", epic.name)
        logger.debug("History of the agent when generating features for epic %s: %s", epic.name, history.action_results())
        raise Exception("Failed to generate features for epic, result is None")

    # Parse the test cases from the LLM response
    features = _parse_features(result)

    return [Feature(name=f['name'], description=f['description'], urls=f['urls']) for f in features]


def handle_background_task_errors(func):
    """Decorator to handle background task errors."""
    @functools.wraps(func)
    async def wrapper(task_id: str, *args, **kwargs):
        try:
            task_status_manager.set_status(task_id, "pending")
            results = await func(task_id, *args, **kwargs)
            task_status_manager.set_status(task_id, "completed", results=results)
            return results
        except Exception as e:
            error_message = str(e)
            stack_trace = traceback.format_exc()
            logger.error(f"Error in background task {task_id}: {error_message}\n{stack_trace}")
            task_status_manager.set_status(task_id, "error", error=error_message)
            raise e

    wrapper.get_status = lambda task_id: task_status_manager.get_status(task_id)
    return wrapper


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

    auth_session = await generate_auth_session(
        product.url,
        secrets,
    )

    with NamedTemporaryFile(suffix=".json", mode="w+") as cookies_file:
        cookies_file.write(json.dumps(auth_session['cookies']))
        cookies_file.flush()
        cookies_file.seek(0)

        features = await _generate_features(
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
            logger.error(f"Failed to decrypt secrets: {str(e)}")
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
