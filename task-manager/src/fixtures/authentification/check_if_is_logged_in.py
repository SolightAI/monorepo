import os
import json

from typing import Optional
from logging import getLogger
from pydantic import SecretStr
from tempfile import NamedTemporaryFile
from langchain_openai import AzureChatOpenAI
from browser_use import Agent, Browser, BrowserConfig
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from utils.s3_utils import upload_gif_to_s3
from utils.constants import AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY


CHECK_LOGIN_PROMPT = """
You are an AI assistant acting as a test automation engineer. Your task is to check if the user is logged in to the application.

Look at the current page and determine if the user is logged in.
If the user is logged in, say "User is logged in".
If the user is not logged in, say "User is not logged in".
""".strip()


AGENT_CLIENT = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_key=SecretStr(AZURE_OPENAI_KEY),
    temperature=0.0,
)


logger = getLogger(__name__)


async def check_is_logged_in(
    task_id: str,
    url: str,
    existing_session: Optional[dict[str, dict[str, str]]],
) -> bool:
    """
    Check if the user is still logged in to the webapp

    Args:
        url: The website URL
        existing_session: The session data to check

    Returns:
        True if logged in, False otherwise
    """

    with NamedTemporaryFile(suffix='_check_login.json', delete=True, mode='w+') as cookies_file:

        json.dump(existing_session["cookies"], cookies_file)
        cookies_file.flush()
        cookies_file.seek(0)

        browser = Browser(
            config=BrowserConfig(
                headless=os.getenv("HEADLESS", "true").lower() == "true",
            )
        )
        logger.info(f"[{task_id}] Checking if the user is logged in to {url}")

        context = BrowserContext(browser=browser, config=BrowserContextConfig(
            cookies_file=cookies_file.name,
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
            llm=AGENT_CLIENT,
            initial_actions=[{'go_to_url': {'url': url}}],
            browser_context=context,
            enable_memory=False,
        )

        try:
            history = await agent.run(max_steps=5)
            result = history.final_result()
        finally:
            await context.close()
            await browser.close()

        is_logged_in = result is not None and "User is logged in".lower() in result.lower()
        logger.info(f"[{task_id}] Login check result: {'Logged in' if is_logged_in else 'Not logged in'}")

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
            task_type="check_login",
            task_name=url,
        )
        if s3_url:
            logger.info(f"[{task_id}] Auth Session Generation GIF uploaded to S3: {s3_url}")

    return is_logged_in
