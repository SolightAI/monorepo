import logging
import re

from browser_use import Agent
from browser_use.browser.browser import Browser, BrowserConfig
from browser_use.browser.context import BrowserContext, BrowserContextConfig
from langchain_openai import ChatOpenAI

from src.validate_url.dto import Result
from src.validate_url.config import Config

logger = logging.getLogger(__name__)


"""
Confidence levels for login page detection.
"""
CONFIDENCE_HIGH = "high"
CONFIDENCE_MEDIUM = "medium"
CONFIDENCE_LOW = "low"

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
    CONFIDENCE_HIGH=CONFIDENCE_HIGH,
    CONFIDENCE_MEDIUM=CONFIDENCE_MEDIUM,
    CONFIDENCE_LOW=CONFIDENCE_LOW,
)


async def run(config: Config, url: str) -> Result:
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
    )

    browser, context = _configure_browser(config)

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

        return Result(
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

        return Result(
            valid=False,
            login_url=None,
            confidence=CONFIDENCE_LOW,
            message="An error occurred while validating the URL",
            original_url=url,
            source="validation",
        )

    finally:
        # Clean up resources
        await context.close()
        await browser.close()


def _configure_browser(config: Config) -> tuple[Browser, BrowserContext]:
    """
    Configure and return a ready to use browser with its context.

    Args:
        config (Config): The configuration object.

    Returns:
        tuple: A tuple containing the browser and context.
    """
    browser = Browser(
        config=BrowserConfig(
            headless=config["headless"],
            extra_browser_args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--single-process",
                "--no-zygote",
                "--disable-setuid-sandbox",   
            ]
        )
    )

    context = BrowserContext(
        browser=browser,
        config=BrowserContextConfig(
            minimum_wait_page_load_time=1,
            viewport_expansion=0,
            wait_between_actions=0,
        ),
    )

    return browser, context


def _extract_result(result: str) -> tuple[bool, str, str]:
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
    confidence = CONFIDENCE_LOW
    confidence_match = re.search(r"<confidence>(.*?)</confidence>", result, re.DOTALL)
    if confidence_match:
        confidence = confidence_match.group(1).strip().lower()

    return found, login_url, confidence


def _page_not_found_tag() -> str:
    """
    Return the default tag for a page not found result.

    Returns:
        str: The default tag for a page not found result.
    """
    return "<login_page_detection><found>false</found></login_page_detection>"
