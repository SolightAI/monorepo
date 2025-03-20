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
from generate_user_stories.dto import Product, Epic, Feature, UserStory
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from fastapi import APIRouter, BackgroundTasks, HTTPException
from utils.crypto import crypto_service
from utils.task_status import task_status_manager


PROMPT = """
You are an AI assistant acting as a test automation engineer. Your task is to generate a suite of user stories based on the provided product information, epic and feature. Follow these instructions carefully to create well-structured, maintainable, and easy-to-understand user stories.

First, review the following information:

== Product ==
Project: {product.name}
URL: {product.url}
Description: {product.description}

== Epic ==
Name: {epic.name}
Description: {epic.description}

== Feature ==
Name: {feature.name}
Description: {feature.description}
URL: {url}

Analyze the provided information carefully.

Generate a suite of user stories that thoroughly cover the feature. Each user story should have a clear and descriptive title

Some extra ground rules:
- Do not logout from the application when generating the user stories
- Do not exit from the application when generating the user stories
- If you need to login, stop by raising an exception to the user
- If you're on an unrelated page, stop by raising an exception to the user

On your final response, for each user story, you should write the following informations in the following format:
<user_story>
content of the user story ("As a user, I ...")
</user_story>
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


router = APIRouter(prefix="/generate-user-stories")
logger = getLogger(__name__)


def _parse_user_stories(user_stories_text: str) -> list[dict[str, str]]:
    """Parse the text returned from LLM into a list of user story dictionaries."""
    # Use regex to extract user stories
    user_stories = []
    pattern = r'<user_story>\s*(.*?)</user_story>'

    matches = re.finditer(pattern, user_stories_text, re.DOTALL)

    for match in matches:
        user_stories.append(match.group(1).strip())

    return user_stories


async def _generate_user_stories(
    product: Product,
    epic: Epic,
    feature: Feature,
    cookies_file: str | None = None,
    localStorage: str | None = None,
    gif_output_path: str | bool = False,
) -> list[UserStory]:
    """
    Generate user stories for a feature.

    Args:
        product: Product information
        epic: Epic information
        feature: Feature information
        cookies_file: Path to cookies file for browser automation
        localStorage: Path to localStorage file for browser automation
        gif_output_path: Path to store GIF output of browser automation

    Returns:
        List of generated user stories
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
    await context.navigate_to(feature.urls[0])  # allowing us to load the localStorage

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
            feature=feature,
            url=feature.urls[0],
        ),
        llm=LLM_CLIENT,
        initial_actions=[{'go_to_url': {'url': feature.urls[0]}}, {'go_to_url': {'url': feature.urls[0]}}],
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
        raise Exception("Failed to generate user stories for feature")

    if result is None:
        logger.error("Couldn't generate user stories for feature for %s", feature.name)
        logger.debug("History of the agent when generating user stories for feature for %s: %s", feature.name, history.action_results())
        raise Exception("Failed to generate user stories for feature, result is None")

    # Parse the test cases from the LLM response
    user_stories = _parse_user_stories(result)

    return [UserStory(name=us) for us in user_stories]


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
async def background_generate_user_stories(
    task_id: str,
    product: Product,
    epic: Epic,
    feature: Feature,
    secrets: dict[str, dict[str, str]],
    gif_output_path: str | bool = False,
) -> list[UserStory]:
    """
    Background task to generate user stories for a feature.

    Args:
        task_id: Task ID for tracking
        product: Product information
        epic: Epic information
        feature: Feature information
        secrets: Dictionary of secrets for authentication
        gif_output_path: Path to store GIF output of browser automation

    Returns:
        List of generated user stories
    """

    auth_session = await generate_auth_session(
        product.url,
        secrets,
    )

    with NamedTemporaryFile(suffix=".json", mode="w+") as cookies_file:
        cookies_file.write(json.dumps(auth_session['cookies']))
        cookies_file.flush()
        cookies_file.seek(0)

        user_stories = await _generate_user_stories(
            product=product,
            epic=epic,
            feature=feature,
            cookies_file=cookies_file.name if auth_session.get('cookies') is not None else None,
            localStorage=auth_session.get('localStorage'),
            gif_output_path=gif_output_path,
        )

    return user_stories


@router.post("/")
async def generate_user_stories(
    product: Product,
    epic: Epic,
    feature: Feature,
    background_task: BackgroundTasks,
    encrypted_secrets: Optional[dict[str, dict[str, str]]] = None,
) -> str:
    """
    Endpoint to generate user stories for a feature.

    Args:
        product: Product information
        epic: Epic information
        feature: Feature information
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
        background_generate_user_stories,
        task_id=task_id,
        product=product,
        epic=epic,
        feature=feature,
        secrets=secrets_to_use or {},
        gif_output_path="/tmp",
    )

    return task_id


@router.get("/status/{task_id}")
async def get_user_stories_generation_status(
    task_id: str,
) -> dict[str, Any]:
    """
    Get the status of a user stories generation task.

    Args:
        task_id: Task ID to check

    Returns:
        Dictionary with task status information
    """
    status = task_status_manager.get_status(task_id)
    return status


# TODO: Test both w/ and w/o the browser-use to see what leads to better results
# TODO: give access to doc RAD so the agent can ask questions about the product
