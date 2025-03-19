import os

from logging import getLogger
from pydantic import SecretStr
from langchain_openai import AzureChatOpenAI
from browser_use import Agent, Browser, BrowserConfig
from browser_use.browser.context import BrowserContextConfig, BrowserContext


PROMPT = """
You are an AI assistant acting as a test automation engineer. Your task is to login to the application.

If both the google oauth and the email/password login are available, you should try the email/password login first.
If the email/password login is not available, you should use the google oauth login.

If the provided credentials are invalid, you should raise an error message that must include "[AN ERROR OCCURED]".
In case of invalid credentials, you will probably see an error message on screen.
However, if the credentials are valid, you will not see any message on screen confirming the login. It's up to you to detect if the login was successful.
""".strip()


if (azure_openai_key := os.getenv('AZURE_OPENAI_KEY')) is None:
    raise ValueError('AZURE_OPENAI_KEY is not set')

if (azure_openai_endpoint := os.getenv('AZURE_OPENAI_ENDPOINT')) is None:
    raise ValueError('AZURE_OPENAI_ENDPOINT is not set')


CLIENT = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=azure_openai_endpoint,
    api_key=SecretStr(azure_openai_key),
    temperature=0.0,
)


logger = getLogger(__name__)


async def generate_auth_session(
    url: str,
    secrets: dict[str, dict[str, str]],
    gif_output_path: str | bool = False,
) -> dict[str, dict[str, str]]:

    """
    Login to the webapp and return the generated cookies
    """

    if 'username_password' not in secrets:
        raise ValueError('No username or password found in secrets')

    sensitive_data = {f"{_sec_category}:{_sec_name}": _sec_value for _sec_category, _secrets in secrets.items() for _sec_name, _sec_value in _secrets.items()}

    # if (
    #     username.get_secret_value() is None or len(username.get_secret_value()) == 0
    #     or password.get_secret_value() is None or len(password.get_secret_value()) == 0
    # ):
    #     raise ValueError('Username or password is empty')

    # logger.info(f"Generating cookies for {url} with username {username.get_secret_value()} and password {password.get_secret_value()}")

    browser = Browser(
        config=BrowserConfig(
            headless=os.getenv("HEADLESS", "true").lower() == "true",
            chrome_instance_path=os.getenv("CHROME_INSTANCE_PATH", None)
        )
    )

    context = BrowserContext(browser=browser, config=BrowserContextConfig(
        cookies_file=os.getenv("COOKIES_FILE", None),
        minimum_wait_page_load_time=1,
        viewport_expansion=0,
    ))

    if gif_output_path:
        os.makedirs(os.path.dirname(gif_output_path), exist_ok=True)

    agent = Agent(
        task=PROMPT,
        llm=CLIENT,
        sensitive_data=sensitive_data,
        initial_actions=[{'go_to_url': {'url': url}}, {'go_to_url': {'url': url}}],  # twice cause it some case we have a redirect at the first try
        browser_context=context,
        # generate_gif=gif_output_path,  # NOTE: deactivated cause it leads to thread blocking
    )

    try:
        history = await agent.run(max_steps=15)
    finally:
        cookies = await context.session.context.cookies()
        localStorage_data = await context.execute_javascript("""
        (() => {
            const items = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                items[key] = localStorage.getItem(key);
            }
            return items;
        })()
        """.strip())
        await context.close()
        await browser.close()

    result = history.final_result()  # type: ignore

    if history.has_errors() or not history.is_done() or result is None or not history.is_successful() or "[AN ERROR OCCURED]" in result:
        raise Exception(f"Failed to login to {url}, result is None")

    return {"cookies": cookies, "localStorage": localStorage_data}
