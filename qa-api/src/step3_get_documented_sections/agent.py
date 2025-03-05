import os

from logging import getLogger
from pydantic import SecretStr
from langchain_openai import AzureChatOpenAI
from step2_get_website_sections.agent import WebsiteSection
from browser_use import Agent, Browser, BrowserConfig
from browser_use.browser.context import BrowserContext, BrowserContextConfig
from prefect import task


PROMPT = """\
You are the Head of Documentation and are creating a comprehensive internal guide for the following section of the product:
{section_name}: {section_description}

Write a comprehensive and detailed internal documentation for this section.

Include:
- A description of the section, what it is, where it starts and where it ends
- Prerequisites and required access levels (if any, don't invent anything you haven't seen youself)
- The list of features that are included in this section. Be sure to include all the existing features of the section. Do not only describe visible features (what you see on the screen), but also functional features (actions that can be performed).
- Any dependencies of this feature to other features
- Any dependencies of other features to this feature

Do not:
- Include any placeholders in your output
- Invent anything that you haven't seen and verified yourself (e.g. if you don't see a feature, don't invent it, if you don't see a dependency, don't invent it, if you don't see a prerequisite, don't invent it)
- Write any "may", "might", "could", don't use assumptions. You must verify everything and be sure of everything no matter how many steps it takes.
- Document sections outside of the provided section scope.
- Mention example data or values

Format the documentation using:
- Clear hierarchical structure with numbered steps
- The following h2 headers: Overview, Prerequisites and Access Levels, Features, Dependencies
- Bold text for important information
- Bullet points for lists
- Table of contents

Before writing the guide, make sure that you have explored the section and know all the features.
Note that dependencies are not always obvious and can be hard to find, take the time to explore the product to not miss any dependencies.

In order to help you write the guide and find your section, you can use the following website documentation:
{website_documentation}
""".strip()


AGENT_LLM = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT', ''),
    api_key=SecretStr(os.getenv('AZURE_OPENAI_KEY', '')),
    temperature=0.0,
)


logger = getLogger(__name__)


@task(retries=2, retry_delay_seconds=[1, 2, 4])
async def generate_section_documentation(
    website_url: str,
    website_documentation: str,
    section: WebsiteSection,
    headless: bool = False,
) -> WebsiteSection:

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
            section_name=section.name,
            section_description=section.description,
            website_documentation=website_documentation,
        ),
        llm=AGENT_LLM,
        initial_actions=[{'go_to_url': {'url': website_url}}],
        browser_context=context,
        # generate_gif=False,
    )

    try:
        history = await agent.run(max_steps=30)
    finally:
        await context.close()
        await browser.close()

    result = history.final_result()

    if result is None:
        logger.error("Failed to generate section documentation, result is None")
        logger.warning("History of the agent when generating documentation for %s: %s", website_url, history.action_results())
        raise Exception("Failed to generate section documentation, result is None")

    return WebsiteSection(
        name=section.name,
        description=section.description,
        documentation=result,
    )
