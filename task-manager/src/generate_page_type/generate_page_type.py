import re
from logging import getLogger
from typing import Literal
from browser_use import Agent, Browser, BrowserConfig
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from utils.dto import Product
import os
import json
from langchain_openai import AzureChatOpenAI
from pydantic import SecretStr
from utils.dto import PageType

logger = getLogger(__name__)

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


PAGE_TYPE_PROMPT = f"""
You are an AI assistant acting as a product owner. Your task is to analyze the current page and determine if it's a marketing/landing page or the actual product interface.

First, review the following information:

== Product ==
Project: {{product.name}}
URL: {{product.url}}
Description: {{product.description}}

CRITICAL:If there is log in or sign up components in the URL or in the description, stop immediately and output this:
<page_type>
{PageType.PRODUCT.value}
</page_type>

CRITICAL: Your response MUST start with one of these tags:

If you're on a marketing/landing page (you see pricing, features list, testimonials, hero sections, etc.) stop immediately and output this:
<page_type>
{PageType.MARKETING.value}
</page_type>

If you're on the product interface (you see user interface elements, forms, data tables, etc.), output this:
<page_type>
{PageType.PRODUCT.value}
</page_type>

Some extra ground rules:
- Do not logout from the application when analyzing
- Do not exit from the application when analyzing
""".strip()


def check_page_type(result: str) -> Literal["marketing", "product"]:
    """
    Check if the agent's response indicates we're on a product page.
    
    Args:
        result: The agent's response text
        
    Returns:
        "product" if we're on a product page, "marketing" if we're on a marketing page
        
    Raises:
        Exception: If the response is missing the page type tag
    """
    page_type_check = re.search(r"<page_type>\s*(marketing|product)\s*</page_type>", result, re.IGNORECASE)
    if not page_type_check:
        logger.error("Agent response missing <page_type> tag. Response: %s", result)
        raise Exception("Agent response missing <page_type> tag")
        
    page_type = page_type_check.group(1).strip().lower()
    return page_type


async def analyze_page_type(
    product: Product,
    localStorage: str | None = None,
) -> Literal["marketing", "product"]:
    """
    Analyze the current page to determine if it's a marketing page or product interface.
    
    Args:
        product: Product information
        localStorage: Path to localStorage file for browser automation
        
    Returns:
        "product" if we're on a product page, "marketing" if we're on a marketing page
    """
    # Configure the browser session
    browser_config = BrowserConfig(
        headless=os.getenv("HEADLESS", "true").lower() == "true",
    )
    browser = Browser(browser_config)
    context = BrowserContext(browser=browser, config=BrowserContextConfig(
        minimum_wait_page_load_time=1,
        viewport_expansion=0,
    ))

    try:
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
                logger.error(error)

        # Create agent with the prompt and browser context
        agent = Agent(
            task=PAGE_TYPE_PROMPT.format(product=product),
            llm=LLM_CLIENT,
            initial_actions=[{'go_to_url': {'url': product.url}}, {'go_to_url': {'url': product.url}}],
            browser_context=context,
        )

        history = await agent.run(max_steps=30)
        result = history.final_result()

        if history.has_errors() or not history.is_done() or result is None or not history.is_successful():
            raise Exception("Failed to analyze page type")

        if result is None:
            logger.error("Couldn't analyze page type for product %s", product.name)
            logger.debug("History of the agent when analyzing page type for product %s: %s", product.name, history.action_results())
            raise Exception("Failed to analyze page type, result is None")

        return check_page_type(result)

    finally:
        await context.close()
        await browser.close()


def get_marketing_page_error_message() -> str:
    """
    Get the error message to display when a marketing page is detected.
    
    Returns:
        The formatted error message with instructions
    """
    return (
        "We couldn't find your product interface – it looks like a marketing page.\n\n"
        "To fix this, please add a short description showing how to access your web app:\n\n"
        "1. Open your product from the navigation bar\n"
        "2. Click the Edit button\n"
        "3. In the description, explain how to open the product (e.g. 'Click Launch App')\n"
        "4. Click Save\n"
        '5. Press "Generate Epics" or "Generate All" again'
    ) 