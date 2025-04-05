import os
import json
from tempfile import NamedTemporaryFile

from logging import getLogger
from pydantic import SecretStr
from langchain_openai import AzureChatOpenAI
from browser_use import Agent, Browser, BrowserConfig
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from typing import Optional
from utils.session_manager import get_cached_session, cache_session, update_session_timestamp
from utils.history_validator import validate_agent_history
from utils.s3_utils import upload_gif_to_s3


OAUTH = "oauth_credential"
USERNAME_PASSWORD = "username_password"


PROMPT = """
You are an AI assistant acting as a test automation engineer. Your task is to login to the application.

Determine which authentication method to use based on the type of credentials provided:
- If '{USERNAME_PASSWORD}' credentials are provided, use the email/password login flow.
- If '{OAUTH}' credentials are provided with 'provider' set to 'Google', use the Google OAuth login flow.
- If both types are available, prioritize using the '{USERNAME_PASSWORD}' credentials.

If the provided credentials are invalid, you should raise an error message that must include "[AN ERROR OCCURED]".
In case of invalid credentials, you will probably see an error message on screen.
However, if the credentials are valid, you will not see any message on screen confirming the login. It's up to you to detect if the login was successful.

Note that some '{USERNAME_PASSWORD}' credentials might be done in two steps where the you would first need to past the username, then click on a button to continue to the password input.
""".strip().format(USERNAME_PASSWORD=USERNAME_PASSWORD, OAUTH=OAUTH)

CHECK_LOGIN_PROMPT = """
You are an AI assistant acting as a test automation engineer. Your task is to check if the user is logged in to the application.

Look at the current page and determine if the user is logged in.
If the user is logged in, say "User is logged in".
If the user is not logged in, say "User is not logged in".
""".strip()


if (azure_openai_key := os.getenv('AZURE_OPENAI_KEY')) is None:
    raise ValueError('AZURE_OPENAI_KEY is not set')

if (azure_openai_endpoint := os.getenv('AZURE_OPENAI_ENDPOINT')) is None:
    raise ValueError('AZURE_OPENAI_ENDPOINT is not set')


CLIENT = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=azure_openai_endpoint,
    api_key=SecretStr(azure_openai_key),
    temperature=0.0,
)


logger = getLogger(__name__)


async def check_is_logged_in(
    task_id: str,
    url: str,
    existing_session: Optional[dict[str, dict[str, str]]],
    user_id: str,
) -> bool:
    """
    Check if the user is still logged in to the webapp

    Args:
        url: The website URL
        existing_session: The session data to check
        user_id: Identifier for the user (for logging purposes)

    Returns:
        True if logged in, False otherwise
    """
    browser = Browser(
        config=BrowserConfig(
            headless=os.getenv("HEADLESS", "true").lower() == "true",
        )
    )

    context = BrowserContext(browser=browser, config=BrowserContextConfig(
        cookies_file=os.getenv("COOKIES_FILE", None),
        minimum_wait_page_load_time=1,
        viewport_expansion=0,
        wait_between_actions=0,  # Not an env var cause we want to make sure it's always 0
    ))

    # First navigate to the URL to initialize the session
    await context.navigate_to(url)

    # Apply existing session data if available
    if existing_session is not None:
        # Set cookies
        if "cookies" in existing_session:
            await context.session.context.add_cookies(existing_session["cookies"])
            # Navigate again to apply cookies
            await context.navigate_to(url)

        # Set localStorage
        if "localStorage" in existing_session:
            load_script = """
            (storage => {
                Object.keys(storage).forEach(key => {
                    localStorage.setItem(key, storage[key]);
                });
                return localStorage.length;
            })(%s)
            """ % json.dumps(existing_session["localStorage"])
            await context.execute_javascript(load_script)

    agent = Agent(
        task=CHECK_LOGIN_PROMPT,
        llm=CLIENT,
        initial_actions=[{'go_to_url': {'url': url}}],
        browser_context=context,
    )

    try:
        history = await agent.run(max_steps=5)
        result = history.final_result()

        is_logged_in = result is not None and "User is logged in".lower() in result.lower()
        logger.info(f"[{task_id}] Login check result for user {user_id}: {'Logged in' if is_logged_in else 'Not logged in'}")
        return is_logged_in
    finally:
        await context.close()
        await browser.close()


async def generate_auth_session(
    task_id: str,
    url: str,
    secrets: dict[str, dict[str, str]],
    gif_output_path: str | bool = False,
    reuse_session: bool = True,
) -> dict[str, dict[str, str]]:

    """
    Login to the webapp and return the generated cookies.
    If reuse_session is True, will attempt to reuse cached sessions if they're still valid.
    """

    # Extract user_id from secrets - check both username_password and oauth_credential
    user_id = None
    if USERNAME_PASSWORD in secrets and "username" in secrets[USERNAME_PASSWORD]:
        user_id = secrets[USERNAME_PASSWORD]["username"]
    elif OAUTH in secrets and "username" in secrets[OAUTH]:
        user_id = secrets[OAUTH]["username"]

    if not user_id:
        raise RuntimeError("No valid credentials found (missing username). Stopping here.")

    # First check if we can reuse a cached session
    if reuse_session:
        cached_session = await get_cached_session(url, user_id)
        if cached_session:
            logger.info(f"[{task_id}] Found cached session for {url} (user: {user_id}), checking if still valid...")
            if await check_is_logged_in(task_id, url, cached_session, user_id):
                logger.info(f"[{task_id}] Cached session for user {user_id} is still valid, reusing it")
                await update_session_timestamp(url, user_id)
                return cached_session
            else:
                logger.info(f"[{task_id}] Cached session for user {user_id} is no longer valid, generating a new one")
        else:
            logger.info(f"[{task_id}] No cached session found for {url} (user: {user_id}), generating a new one")

    # Validate that we have at least one valid credential type
    if USERNAME_PASSWORD not in secrets and OAUTH not in secrets:
        raise ValueError('No valid credentials found in secrets (need username_password or oauth_credential)')

    sensitive_data = {f"{_sec_category}:{_sec_name}": _sec_value for _sec_category, _secrets in secrets.items() for _sec_name, _sec_value in _secrets.items()}

    browser = Browser(
        config=BrowserConfig(
            headless=os.getenv("HEADLESS", "true").lower() == "true",
        )
    )

    context = BrowserContext(browser=browser, config=BrowserContextConfig(
        cookies_file=os.getenv("COOKIES_FILE", None),
        minimum_wait_page_load_time=1,
        viewport_expansion=0,
        wait_between_actions=0,  # Not an env var cause we want to make sure it's always 0
    ))

    if gif_output_path:
        os.makedirs(os.path.dirname(gif_output_path), exist_ok=True)

    agent = Agent(
        task=PROMPT,
        llm=CLIENT,
        sensitive_data=sensitive_data,
        initial_actions=[{'go_to_url': {'url': url}}, {'go_to_url': {'url': url}}],  # twice cause it some case we have a redirect at the first try
        browser_context=context,
        # generate_gif=gif_output_path,  # NOTE: deactivated cause it leads to thread blocking
        use_vision_for_planner=False,
        use_vision=False,
    )

    try:
        history = await agent.run(max_steps=15)
    finally:
        cookies = await context.session.context.cookies()
        localStorage_data = await context.execute_javascript("""
        (() => {
            const items = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                items[key] = localStorage.getItem(key);
            }
            return items;
        })()
        """.strip())
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
            file_path=temp_gif.name,
            task_id=task_id,
            task_type="auth",
            task_name=url,
            additional_params={"user_id": user_id}
        )
        if s3_url:
            logger.info(f"[{task_id}] Auth Session Generation GIF uploaded to S3: {s3_url}")

    # Validate the history and get the result
    await validate_agent_history(
        task_id=task_id,
        history=history,
        task_name=f"login to {url}",
        error_markers=["[AN ERROR OCCURED]"],
        empty_result_is_ok=True,
    )

    session_data = {"cookies": cookies, "localStorage": localStorage_data}

    # Cache the new session for future use
    await cache_session(url, user_id, session_data)

    return session_data
