import os
import re
import json
import difflib

from typing import Optional
from logging import getLogger
from pydantic import SecretStr
from tempfile import NamedTemporaryFile
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage
from browser_use import Agent, Browser, BrowserConfig
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from utils.constants import AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY


USER_AUTHENTICATED = "USER_AUTHENTICATED"
USER_LOGGED_OUT = "USER_LOGGED_OUT"
UNKNOWN = "UNKNOWN"


PROMPT = """
You will be analyzing an HTML difference to determine if a user has successfully logged in. The HTML difference shows changes between the page before a login attempt and after. Your task is to determine the login status based on this difference.

Here is the HTML difference:
<html_diff>
{{html_diff}}
</html_diff>

Analyze the HTML difference carefully. Look for changes that might indicate a successful login, such as:
- The appearance of a "Log out" or "Sign out" button
- The disappearance of "Log in" or "Sign in" options
- The presence of a user's name or profile information
- Changes in navigation menu items that suggest a logged-in state

Also, look for changes that might indicate a failed login attempt, such as the persistence of "Log in" or "Sign in" options or any other element that could hint a authentication status.

If there are no clear indicators of a login status change, or if the difference is ambiguous, consider this as well.

Provide your reasoning within <reasoning> tags. Then, give your final answer within <answer> tags using one of these three options:
- {USER_AUTHENTICATED}: If the difference clearly indicates the user has successfully logged in
- {USER_LOGGED_OUT}: If the difference clearly shows the user was already logged in and has now logged out
- {UNKNOWN}: If the login status cannot be determined from the given difference

Expected output format
<reasoning>
[your reasoning process]
</reasoning>
<answer>{USER_AUTHENTICATED}/{USER_LOGGED_OUT}/{UNKNOWN}</answer>
""".strip().format(
    USER_AUTHENTICATED=USER_AUTHENTICATED,
    USER_LOGGED_OUT=USER_LOGGED_OUT,
    UNKNOWN=UNKNOWN,
)


AGENT_CLIENT = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_key=SecretStr(AZURE_OPENAI_KEY),
    temperature=0.0,
)


logger = getLogger(__name__)


def clean_html_content(html_content: str) -> str:
    """
    Removes the 'd' attribute from SVG path elements and all content within <style> tags
    in the given HTML string.
    """
    # Remove d="..." attribute specifically from path elements
    pattern_d = r' d=".*?"'
    cleaned_content = re.sub(pattern_d, '', html_content)

    # Remove <style>...</style> content
    pattern_style = r'<style.*?>.*?</style>'
    cleaned_content = re.sub(pattern_style, '', cleaned_content, flags=re.DOTALL)

    # Remove <script>...</script> content
    pattern_script = r'<script.*?>.*?</script>'
    cleaned_content = re.sub(pattern_script, '', cleaned_content, flags=re.DOTALL)

    # Remove <iframe>...</iframe> content
    pattern_iframe = r'<iframe.*?>.*?</iframe>'
    cleaned_content = re.sub(pattern_iframe, '', cleaned_content, flags=re.DOTALL)

    return cleaned_content


def compare_html_files(file1_content, file2_content):
    """
    Compare two HTML files after cleaning them and return differences as a string.

    Args:
        file1_content: Content of the first HTML file
        file2_content: Content of the second HTML file

    Returns:
        String containing the differences with prefixes
    """

    # Clean the HTML content before comparing
    cleaned_file1_content = clean_html_content(file1_content)
    cleaned_file2_content = clean_html_content(file2_content)

    # Split content into lines for difflib
    file1_lines = cleaned_file1_content.splitlines()
    file2_lines = cleaned_file2_content.splitlines()

    # Compare the cleaned files using unified_diff
    diff_generator = difflib.unified_diff(
        file1_lines,
        file2_lines,
        n=2,  # Number of context lines
        lineterm=''  # Don't add newlines to control lines
    )

    # Join the differences into a single string
    diff_text = '\n'.join(diff_generator)

    return diff_text


def _parse_result_from_html_diff(result: str) -> bool:
    return re.search(r"<answer>(USER_AUTHENTICATED|USER_LOGGED_OUT|UNKNOWN)</answer>", result).group(1) == "USER_AUTHENTICATED"


async def check_is_logged_in_using_html_diff(
    task_id: str,
    before_login_html: str,
    after_login_html: str,
    max_length: int = 100_000,
) -> bool:
    """
    Check if the user is still logged in to the webapp

    Args:
        url: The website URL
        existing_session: The session data to check

    Returns:
        True if logged in, False otherwise
    """

    html_diff = compare_html_files(before_login_html, after_login_html)

    if len(html_diff) > max_length:
        html_diff = html_diff[-max_length:]

    result = AGENT_CLIENT.invoke(
        [
            HumanMessage(
                content=PROMPT.format(html_diff=html_diff)
            )
        ]
    ).content

    logger.info(f"[{task_id}] Login check result: {result}")

    return _parse_result_from_html_diff(result)


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
            maximum_wait_page_load_time=5,
            viewport_expansion=0,
            wait_between_actions=0,  # Not an env var cause we want to make sure it's always 0
        ))

        # First navigate to the URL to initialize the session
        await context.navigate_to(url)
        content_before_login = await (await context.get_current_page()).content()

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

        agent = Agent(  # required to refresh the page
            task="exit immediately",
            llm=AGENT_CLIENT,
            initial_actions=[{'go_to_url': {'url': url}}],
            browser_context=context,
            enable_memory=False,
            use_vision=True,
        )

        try:
            await agent.run(max_steps=0)  # we do not need to run the agent, we just need to refresh the page
        finally:
            content_after_login = await (await agent.browser_context.get_current_page()).content()
            is_logged_in = await check_is_logged_in_using_html_diff(
                task_id=task_id,
                before_login_html=content_before_login,
                after_login_html=content_after_login,
            )
            await context.close()
            await browser.close()

        logger.info(f"[{task_id}] Login check result: {'Logged in' if is_logged_in else 'Not logged in'}")

    return is_logged_in
