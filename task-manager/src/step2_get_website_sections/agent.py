import os

from logging import getLogger
from pydantic import BaseModel
from pydantic import SecretStr
from browser_use import Controller
from langchain_openai import AzureChatOpenAI
from browser_use import Agent, Browser, BrowserConfig
from browser_use.browser.context import BrowserContext, BrowserContextConfig
from prefect import task


PROMPT = """\
You are the Head of Quality Assurance and you are tasked with identifying the key areas of the product that should be tested based on its documentation. Your goal is to create a comprehensive list of all sections of the product that should be tested without writing individual tests.

Here is the documentation for the product:

<documentation>
{website_documentation}
</documentation>

Analyze the provided documentation carefully. Identify the main sections of the product that should be tested. Remember, we are not concerned with security testing nor error handling at this time.
When creating your list of sections, focus on the main features and functionalities, do not go too atomic. We want big sections (e.g., Dashboard, Customer Management, etc.).

Provide a comprehensive list of sections, each with a brief description of what the section is about, what it contains and how to navigate to it. Ensure that your sections covers all major parts of the product.
""".strip()


AGENT_LLM = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT', ''),
    api_key=SecretStr(os.getenv('AZURE_OPENAI_KEY', '')),
    temperature=0.0,
)


class WebsiteSection(BaseModel):
    name: str
    description: str
    documentation: str | None = None


class WebsiteSections(BaseModel):
    sections: list[WebsiteSection]


logger = getLogger(__name__)


@task(retries=2, retry_delay_seconds=[1, 2, 4])
async def generate_website_sections(
    website_url: str,
    website_documentation: str,
    headless: bool = False,
    gif_output_folder: str | None = None,
) -> WebsiteSections:

    browser = Browser(
        config=BrowserConfig(
            headless=headless,
            chrome_instance_path=os.getenv("CHROME_INSTANCE_PATH", None)
        )
    )

    context = BrowserContext(browser=browser, config=BrowserContextConfig(
        cookies_file=os.getenv("COOKIES_FILE", None),
    ))

    agent = Agent(
        task=PROMPT.format(
            website_documentation=website_documentation,
        ),
        llm=AGENT_LLM,
        initial_actions=[{'go_to_url': {'url': website_url}}],
        browser_context=context,
        # generate_gif=gif_output_folder is not None,
        controller=Controller(output_model=WebsiteSections),
    )

    try:
        history = await agent.run(max_steps=30)
    finally:
        await context.close()
        await browser.close()

    result = history.final_result()

    if result is None:
        logger.error("Failed to generate website sections, result is None")
        logger.warning("History of the agent when generating sections for %s: %s", website_url, history.action_results())
        raise Exception("Failed to generate website sections, result is None")

    return WebsiteSections.model_validate_json(result)
