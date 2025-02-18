import os

from pydantic import SecretStr
from langchain_openai import AzureChatOpenAI
from browser_use import Agent, Browser, BrowserConfig
from logging import getLogger
from dotenv import load_dotenv
from retry import retry


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


@retry(exceptions=Exception, tries=3, delay=1, backoff=2)
async def generate_website_documentation(website_url: str, headless: bool = False) -> str | None:
    browser = Browser(config=BrowserConfig(headless=headless))
    context = await browser.new_context()

    await context.navigate_to(website_url)


    task_text = """\
Act as a technical documentation writer creating a comprehensive user guide. Create a detailed documentation for the provided website.
You must explore the whole website and verify every single feature.

Include:
- A description of the website and its purpose
- A list of the features of the website
- For each feature, a description of the feature and how to use it
- The dependencies of each feature to other features

Do not:
- Include any placeholders in your output
- Invent anything that you haven't seen in the UI nor verified.
- Mention any error in the website.

Format the documentation using:
- Clear hierarchical structure with numbered steps
- Bold text for important information
- Bullet points for lists
- Warning/Note/Tip boxes for special considerations
- Table of contents
- Cross-references to related procedures

Additional requirements:
- Write in a clear, professional and informative tone suitable for both beginners and experienced users.
- Before writing the guide, make sure that you have explored all pages and know all the features.
- Be super detailed and descriptive. Include all the features.
- Do as many steps and actions as needed to be a hundred percent you've covered everything.
"""


    agent = Agent(
        task=task_text,
        llm=AGENT_LLM,
        browser_context=context,
        generate_gif=False,
    )

    history = await agent.run(max_steps=30)
    result = history.final_result() # type: ignore

    if result is None:
        print("⚠️ ⚠️ Result is None ⚠️ ⚠️", end="\n\n")
        print("History:")
        print(history.action_results())
        raise Exception("Result is None")

    await context.close()
    await browser.close()

    return result
