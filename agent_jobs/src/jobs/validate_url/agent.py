import logging
import re

from browser_use import Agent
from browser_use.browser.browser import Browser
from browser_use.browser.context import BrowserContext, BrowserContextConfig
from langchain_openai import ChatOpenAI

from src.config import Config
from src.agents.utils import create_browser

from .dto import ValidateURLResult, ConfidenceLevel


logger = logging.getLogger(__name__)


PROMPT = """
You are an AI assistant tasked with examining a website to find its login page.

Your task is to:
1. Look for login links, buttons, or forms on the current page
2. If you find a login link or button, click on it to navigate to the login page
3. If you're already on the login page, confirm that login elements (username/email field, password field) are present
4. Report your findings

Your goal is to determine if this website has a login page and if it can be found.

After examining the site, provide a conclusion in the following format:
<login_page_detection>
<found>true/false</found>
<login_url>URL of the login page if found</login_url>
<confidence>'{CONFIDENCE_HIGH}'/'{CONFIDENCE_MEDIUM}'/'{CONFIDENCE_LOW}'</confidence>
</login_page_detection>
""".strip().format(
    CONFIDENCE_HIGH=ConfidenceLevel.HIGH.value,
    CONFIDENCE_MEDIUM=ConfidenceLevel.MEDIUM.value,
    CONFIDENCE_LOW=ConfidenceLevel.LOW.value,
)


async def run(
    config: Config,
    url: str,
) -> ValidateURLResult:
    """
    Run the agent on the given URL and return the result.

    Args:
        config (Config): The configuration object.
        url (str): The URL to run the agent on.

    Returns:
        Result: The result of the agent's execution.
    """
    logger.info(f"Setting up agent to run on {url}")

    agent_client = ChatOpenAI(
        model="gpt-4.1",
        temperature=0.0,
        timeout=120,
        frequency_penalty=0.3,
    )

    browser, context = _configure_browser(config.headless)

    agent = Agent(
        task=PROMPT,
        llm=agent_client,
        initial_actions=[{"go_to_url": {"url": url}}],
        browser_context=context,
        use_vision=True,
        enable_memory=False,
    )

    try:
        logger.info(f"Running agent on {url}")
        # Run the agent and retrieve its history
        history = await agent.run(max_steps=10)

        logger.info(f"Agent finished running on {url}")

        # Retrieve the result from the agent.
        result = history.final_result()
        if result is None:
            logger.info(f"Agent did not find a login page on {url}")
            result = _page_not_found_tag()

        # Extract the result from the agent's final step.
        found, login_url, confidence = _extract_result(result)
        logger.info(f"Agent found login page on {login_url}: {found}")

        return ValidateURLResult(
            valid=found,
            login_url=login_url if found else None,
            confidence=confidence,
            message="Login page found successfully"
            if found
            else "Login page could not be found",
            original_url=url,
            source="validation",
        )

    except Exception as e:
        logger.error(f"Error validating URL: {url} - {str(e)}")

        return ValidateURLResult(
            valid=False,
            login_url=None,
            confidence=ConfidenceLevel.LOW,
            message="An error occurred while validating the URL",
            original_url=url,
            source="validation",
        )

    finally:
        # Clean up resources
        await context.close()
        await browser.close()


def _configure_browser(headless: bool = True) -> tuple[Browser, BrowserContext]:
    """
    Configure and return a ready to use browser with its context.

    Args:
        headless (bool): Whether to run the browser in headless mode.

    Returns:
        tuple: A tuple containing the browser and context.
    """
    browser = create_browser(headless)

    context = BrowserContext(
        browser=browser,
        config=BrowserContextConfig(
            minimum_wait_page_load_time=1,
            viewport_expansion=0,
            wait_between_actions=0,
        ),
    )

    return browser, context


def _extract_result(result: str) -> tuple[bool, str, ConfidenceLevel]:
    """
    Extract the result from the agent's final result.

    Args:
        result (str): The result from the agent's final step.

    Returns:
        tuple: A tuple containing the found flag, login URL, and confidence.
    """
    # Parse the result to determine if a login page was found
    found = "<found>true</found>" in result.lower()
    login_url = ""

    # Extract login URL if available
    login_url_match = re.search(r"<login_url>(.*?)</login_url>", result, re.DOTALL)  # noqa: F821
    if login_url_match:
        login_url = login_url_match.group(1).strip()

    # Extract confidence
    confidence = ConfidenceLevel.LOW
    confidence_match = re.search(r"<confidence>(.*?)</confidence>", result, re.DOTALL)
    if confidence_match:
        confidence = ConfidenceLevel(confidence_match.group(1).strip().lower())

    return found, login_url, confidence


def _page_not_found_tag() -> str:
    """
    Return the default tag for a page not found result.

    Returns:
        str: The default tag for a page not found result.
    """
    return "<login_page_detection><found>false</found></login_page_detection>"
