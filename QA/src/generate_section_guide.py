import os

from pydantic import SecretStr
from langchain_openai import AzureChatOpenAI
from browser_use import Agent, Browser, BrowserConfig
from logging import getLogger
from dotenv import load_dotenv
from retry import retry
# from lmnr import Laminar


load_dotenv()

# getLogger('agent').disabled = True
# getLogger('browser_use.agent.service').disabled = True
# getLogger('browser_use.controller.service').disabled = True
# getLogger('browser_use.browser.context').disabled = True


# this line auto-instruments Browser Use and any browser you use (local or remote)
# Laminar.initialize() # you can also pass project api key here


AGENT_LLM = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT', ''),
    api_key=SecretStr(os.getenv('AZURE_OPENAI_KEY', '')),
    temperature=0.0,
)

# from langchain_anthropic import ChatAnthropic
# AGENT_LLM = ChatAnthropic(
#     model="claude-3-5-sonnet-20241022",
#     # api_version='2024-10-21',
#     # azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT', ''),
#     api_key=SecretStr(os.getenv('ANTHROPIC_API_KEY', '')),
#     temperature=0.0,
# )



# NOTE: There are three levels of testing:
# 1. component wise (i.e verifying that the form doesn't let invalid data be submitted)
# 2. feature wise (i.e verifying that you can add a new customer)
# 3. dependency wise (i.e verifying that newly added customer is counted in the dashboard counter)
@retry(exceptions=Exception, tries=3, delay=1, backoff=2)
async def generate_section_guide(
    website_url: str,
    website_documentation: str,
    section_name: str,
    headless: bool = False,
) -> str | None:

    # browser = Browser(config=BrowserConfig(headless=headless))
    browser = Browser(
        config=BrowserConfig(
            headless=headless,
            chrome_instance_path=os.getenv("CHROME_INSTANCE_PATH", None)
        )
    )

    task_text = f"""\
You are the Head of Documentation and are creating a comprehensive internal guide.

You are currently writing the internal documentation for the "{section_name}" section.
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
"""


    agent = Agent(
        task=task_text,
        llm=AGENT_LLM,
        initial_actions=[{'go_to_url': {'url': website_url}}],
        browser=browser,
        generate_gif=False,
    )

    try:
        history = await agent.run(max_steps=30)
    finally:
        await browser.close()

    result = history.final_result() # type: ignore

    if result is None:
        print("Result is None", end="\n\n")
        print("History:")
        print(history.action_results())
        raise Exception("Result is None")


    return result
