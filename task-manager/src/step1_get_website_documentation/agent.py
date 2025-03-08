import os

# from retry import retry
from logging import getLogger
from pydantic import SecretStr
from langchain_openai import AzureChatOpenAI
from browser_use import Agent, Browser, BrowserConfig
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from prefect import task


# NOTE: I'm not sure about the "and verify every single feature" part.
PROMPT = """\
You're the Head of Internal Documentation of the company. Create a detailed documentation of the provided product.
You must explore the whole product and verify every single feature.

Include:
- A description of the product and its purpose
- A list of the features of the product
- For each feature, a description of the feature and how to use it
- The dependencies of each feature to other features

Do not:
- Spend too much time on this task. Do up to 10 steps.
- Include any placeholders in your output
- Make the documentation specific to this provided client's session.
- Invent anything that you haven't seen in the UI nor verified.
- Mention any error in the product.
- Use any assumptions. Verify every single thing no matter how many steps it takes.
- Promote the product or anything else.

Format the documentation using:
- Clear hierarchical structure with numbered steps
- Bold text for important information
- Bullet points for lists
- Warning/Note/Tip boxes for special considerations
- Table of contents
- Cross-references to related procedures

Additional requirements:
- Write in a clear, professional and super informative tone.
- Before writing the guide, make sure that you have explored all pages and know all the features.
- Be super detailed and descriptive. Include all the features.
- Do as many steps and actions as needed to be a hundred percent you've covered everything.
- If you're encountering a captcha, reload the page and skip the part where you're encountering the captcha.
- You're not able to drop files in the browser, so if a feature requires a file, skip it while documenting it.
""".strip() # FIXME: remove "- Spend too much time on this task. Do up to 10 steps."


AGENT_LLM = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT', ''),
    api_key=SecretStr(os.getenv('AZURE_OPENAI_KEY', '')),
    temperature=0.0,
)


logger = getLogger(__name__)


@task(retries=2, retry_delay_seconds=[1, 2, 4])
async def generate_website_documentation(website_url: str, headless: bool = False, gif_output_folder: str | None = None) -> str:

    browser = Browser(
        config=BrowserConfig(
            headless=headless,
            chrome_instance_path=os.getenv("CHROME_INSTANCE_PATH", None)
        )
    )

    context = BrowserContext(browser=browser, config=BrowserContextConfig(
        cookies_file=os.getenv("COOKIES_FILE", None),
        minimum_wait_page_load_time=1,
    ))

    if gif_output_folder is not None:
        os.makedirs(gif_output_folder, exist_ok=True)

    agent = Agent(
        task=PROMPT,
        llm=AGENT_LLM,
        initial_actions=[{'go_to_url': {'url': website_url}}],
        browser_context=context,
        # generate_gif=os.path.join(gif_output_folder, "website_documentation.gif") if gif_output_folder is not None else None,
    )

    try:
        history = await agent.run(max_steps=100)
    finally:
        await context.close()
        await browser.close()

    result = history.final_result() # type: ignore

    if result is None:
        logger.error("Couldn't generate website documentation for %s", website_url)
        logger.warning("History of the agent when generating documentation for %s: %s", website_url, history.action_results())
        raise Exception("Failed to generate website documentation, result is None")

    return result
