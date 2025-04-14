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
from fixtures.authentification.get_auth_session import get_auth_session
from utils.dto import Product, Epic, Feature, UserStory, AcceptanceCriteria
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from fastapi import APIRouter, BackgroundTasks, HTTPException
from utils.crypto import crypto_service
from utils.task_status import task_status_manager, handle_background_task_errors
from utils.history_validator import validate_agent_history
from utils.s3_utils import upload_gif_to_s3
from utils.constants import AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY


PROMPT = """
You are an AI assistant acting as a test automation engineer. Your task is to generate a suite of acceptance criteria based on the provided product information, epic, feature and user stories. Follow these instructions carefully to create well-structured, maintainable, and easy-to-understand acceptance criteria.

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

== User Stories ==
{user_stories_text}

Analyze the provided information carefully.

Generate a suite of acceptance criteria that thoroughly cover the feature. Each acceptance criteria should have a clear and descriptive name and description.

Some extra ground rules:
- Do not logout from the application when generating the acceptance criteria
- Do not exit from the application when generating the acceptance criteria
- If you need to login, stop by raising an exception to the user
- If you're on an unrelated page, stop by raising an exception to the user

On your final response, for each acceptance criteria, you should write the following informations in the following format:
<acceptance_criteria>
<name>
content of the name
</name>
<description>
content of the description
</description>
</acceptance_criteria>
...
""".strip()


LLM_CLIENT = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_key=SecretStr(AZURE_OPENAI_KEY),
    temperature=0.0,
)


router = APIRouter(prefix="/generate-acceptance-criteria")
logger = getLogger(__name__)


def _parse_acceptance_criteria(task_id: str, acceptance_criteria_text: str) -> list[dict[str, str]]:
    """Parse the text returned from LLM into a list of acceptance criteria dictionaries."""
    # Use regex to extract acceptance criteria
    acceptance_criteria = []
    pattern = r'<acceptance_criteria>\s*(.*?)</acceptance_criteria>'
    name_pattern = r'<name>\s*(.*?)</name>'
    description_pattern = r'<description>\s*(.*?)</description>'

    matches = re.finditer(pattern, acceptance_criteria_text, re.DOTALL)

    for match in matches:
        criteria_content = match.group(1).strip()

        # Extract name
        name_match = re.search(name_pattern, criteria_content, re.DOTALL)

        if not name_match:
            raise Exception(f"[{task_id}] No name found for acceptance criteria: {criteria_content}")

        name = name_match.group(1).strip()

        # Extract description
        description_match = re.search(description_pattern, criteria_content, re.DOTALL)
        if not description_match:
            raise Exception(f"[{task_id}] No description found for acceptance criteria: {criteria_content}")

        description = description_match.group(1).strip()

        acceptance_criteria.append({
            "name": name,
            "description": description
        })

    return acceptance_criteria


async def _generate_acceptance_criteria(
    task_id: str,
    product: Product,
    epic: Epic,
    feature: Feature,
    user_stories: list[UserStory],
    cookies_file: str | None = None,
    localStorage: str | None = None,
    gif_output_path: str | bool = False,
) -> list[AcceptanceCriteria]:
    """
    Generate acceptance criteria for a feature.

    Args:
        product: Product information
        epic: Epic information
        feature: Feature information
        cookies_file: Path to cookies file for browser automation
        localStorage: Path to localStorage file for browser automation
        gif_output_path: Path to store GIF output of browser automation

    Returns:
        List of generated acceptance criteria
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
    await context.navigate_to(feature.urls[0])  # allowing us to load the localStorage

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

    user_stories_text = "\n".join([f"User Story:{us.name}" for us in user_stories])

    # NOTE: we do not provide a controller as models tend to provide better results when not constrained by a controller output model
    agent = Agent(
        task=PROMPT.format(
            product=product,
            epic=epic,
            feature=feature,
            url=feature.urls[0],
            user_stories_text=user_stories_text,
            enable_memory=False,
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
        s3_url = upload_gif_to_s3(
            task_id=task_id,
            file_path=temp_gif.name,
            task_type="acceptance_criteria",
            task_name=feature.name,
            additional_params=feature.model_dump()
        )
        if s3_url:
            logger.info(f"[{task_id}] Acceptance Criteria GIF uploaded to S3: {s3_url}")

    result = await validate_agent_history(
        task_id=task_id,
        history=history,
        task_name=f"generate acceptance criteria for {feature.name}",
    )

    # Parse the test cases from the LLM response
    acceptance_criteria = _parse_acceptance_criteria(task_id, result)

    return [AcceptanceCriteria(name=ac["name"], description=ac["description"]) for ac in acceptance_criteria]


@handle_background_task_errors
async def background_generate_acceptance_criteria(
    task_id: str,
    product: Product,
    epic: Epic,
    feature: Feature,
    user_stories: list[UserStory],
    secrets: dict[str, dict[str, str]],
    gif_output_path: str | bool = False,
) -> list[AcceptanceCriteria]:
    """
    Background task to generate acceptance criteria for a feature.

    Args:
        task_id: Task ID for tracking
        product: Product information
        epic: Epic information
        feature: Feature information
        secrets: Dictionary of secrets for authentication
        gif_output_path: Path to store GIF output of browser automation

    Returns:
        List of generated acceptance criteria
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

        acceptance_criteria = await _generate_acceptance_criteria(
            task_id=task_id,
            product=product,
            epic=epic,
            feature=feature,
            user_stories=user_stories,
            cookies_file=cookies_file.name if auth_session.get('cookies') is not None else None,
            localStorage=auth_session.get('localStorage'),
            gif_output_path=gif_output_path,
        )

    return acceptance_criteria


@router.post("/")
async def generate_acceptance_criteria(
    product: Product,
    epic: Epic,
    feature: Feature,
    user_stories: list[UserStory],
    background_task: BackgroundTasks,
    encrypted_secrets: Optional[dict[str, dict[str, str]]] = None,
) -> str:
    """
    Endpoint to generate acceptance criteria for a feature.

    Args:
        product: Product information
        epic: Epic information
        feature: Feature information
        background_task: Background tasks handler
        encrypted_secrets: Dictionary of encrypted secrets for authentication

    Returns:
        Task ID for tracking the test generation process
    """

    task_id = str(uuid4())

    if len(user_stories) == 0:
        raise HTTPException(status_code=400, detail="No user stories provided")

    secrets_to_use = None

    if encrypted_secrets:
        try:
            secrets_to_use = crypto_service.decrypt_secrets(encrypted_secrets)
            if not secrets_to_use:
                raise HTTPException(status_code=400, detail="No secrets provided")
        except Exception as e:
            logger.error(f"[{task_id}] Failed to decrypt secrets: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to decrypt secrets: {str(e)}. Task ID: {task_id}")

    background_task.add_task(
        background_generate_acceptance_criteria,
        task_id=task_id,
        product=product,
        epic=epic,
        feature=feature,
        user_stories=user_stories,
        secrets=secrets_to_use or {},
        gif_output_path="/tmp",
    )

    return task_id


@router.get("/status/{task_id}")
async def get_acceptance_criteria_generation_status(
    task_id: str,
) -> dict[str, Any]:
    """
    Get the status of a acceptance criteria generation task.

    Args:
        task_id: Task ID to check

    Returns:
        Dictionary with task status information
    """
    status = task_status_manager.get_status(task_id)
    return status


# TODO: Test both w/ and w/o the browser-use to see what leads to better results
# TODO: give access to doc RAD so the agent can ask questions about the product
