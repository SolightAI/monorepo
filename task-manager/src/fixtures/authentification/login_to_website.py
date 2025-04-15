import os
import re
import json

from typing import Any
from logging import getLogger
from pydantic import SecretStr
from tempfile import NamedTemporaryFile
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage
from browser_use import Agent, Browser, BrowserConfig, AgentHistoryList
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from utils.s3_utils import upload_gif_to_s3
from fixtures.authentification.check_if_is_logged_in import check_is_logged_in_using_html_diff
from fixtures.authentification.has_required_secrets import has_required_secrets, LoginMethod, SUPPORTED_LOGIN_METHODS
from utils.constants import AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, TestStatus
from utils.dto import Test
from run_tests.tracing import initialize, extend_agent_history


PROMPT = """
You are an AI assistant acting as a test automation engineer. Your task is to login to an application. Follow these instructions carefully to complete the login process.

First, you will be provided with the available login methods:

<login_methods>
{{login_methods}}
</login_methods>

Determine which authentication method to use based on the type of credentials provided in the login_methods:

1. If '{USERNAME_PASSWORD}' credentials are available, use the email/password login flow.
2. If '{GOOGLE_OAUTH}' credentials are available, use the Google OAuth login flow.
3. If both types of credentials are available, prioritize using the '{USERNAME_PASSWORD}' credentials.
4. Do not use any other authentication method than the ones provided. Do never use the "Instant Log In" method, never click on it.

For the email/password login flow:
1. Enter the username/email in the appropriate field.
2. Check if there is a 'Next' or similar button that needs to be clicked before entering the password. If so, click it. (Do not click on the "Instant Log In" button)
3. If you needed to click on the 'Next' button (or similar), make sure to double check that you actually clicked on it, this is very important. (Do not click on the "Instant Log In" button)
4. Enter the password in the password field.
5. Click the login button.
At each step, verify the state of the page, and act accordingly.

For the Google OAuth login flow:
1. Click on the 'Sign in with Google' or similar button.
2. Follow the Google OAuth process, which typically involves selecting an account or entering Google credentials.

After attempting to log in:
1. Do not expect to see a message confirming successful login.
2. Wait for the full page to load before concluding the login was successful.
3. Once the page is loaded, check if the login was successful by looking for clues in the page content.
4. If you see that you are logged in, you can conclude the login was successful.
5. If you see that you are not logged in, you must retry.

If the login is unsuccessful or you encounter an error message:
1. If the login has failed, raise an error message that includes a description of the error.

Provide your final output in the following format:
<login_attempt>
<method_used>Specify which method was used (email/password or Google OAuth)</method_used>
<login_result>Specify if the login was successful or if an error occurred</login_result>
<error_message>Include the error message here if an error occurred, otherwise omit this tag</error_message>
</login_attempt>
""".strip().format(USERNAME_PASSWORD=LoginMethod.EMAIL.value, GOOGLE_OAUTH=LoginMethod.GOOGLE.value)


PROMPT_SELECT_PARAMETERS = """
You are an AI assistant specialized in test automation engineering. Your task is to select the most appropriate login method for a given test based on the test information and available login methods.

First, review the following test information:

<test_information>
{test_information}
</test_information>

Now, consider the possible login methods:

<login_methods>
{possible_login_methods}
</login_methods>

To select the best login method, please follow these steps:

1. Summarize the key requirements and constraints from the test information.
2. For each possible login method, score it on a scale of 1-5 based on the compatibility with test requirements
3. Compare the overall scores and choose the method with the highest score.
4. If there's a tie, explain your tiebreaker reasoning.

Before making your final selection, wrap your analysis inside <detailed_analysis> tags. This should include your summary of test requirements, the analysis of each method, and your final decision process.

After your analysis, provide your selected login method in <output> tags. Your output should consist of only the selected login method, without any additional explanation or formatting.

Example output structure:

<detailed_analysis>
[Your step-by-step analysis, including summaries, scores, and reasoning]
</detailed_analysis>

<output>
EXAMPLE_LOGIN_METHOD
</output>

Please proceed with your analysis and selection of the best login method for this test.
""".strip()


AGENT_CLIENT = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_key=SecretStr(AZURE_OPENAI_KEY),
    temperature=0.0,
)


logger = getLogger(__name__)


def get_parameters_for_login_to_website(
    task_id: str,
    test: Test,
    secrets: dict[str, dict[str, str]],
) -> dict[str, Any]:

    query = HumanMessage(PROMPT_SELECT_PARAMETERS.format(
        test_information=test.model_dump_json(),
        possible_login_methods="\n".join([f"- {method.value}" for method in LoginMethod]),
    ))

    response = AGENT_CLIENT.invoke([query])

    login_method = re.search(r"<output>(.*?)</output>", response.content, re.DOTALL).group(1).strip()

    if login_method not in [method.value for method in LoginMethod]:
        raise ValueError(f"Invalid login method: {login_method}")

    login_method = LoginMethod(login_method)

    return {
        "task_id": task_id,
        "url": test.url,
        "login_method": login_method,
        "secrets": secrets,
    }


def _select_login_method(login_method: LoginMethod, secrets: dict[str, dict[str, str]]) -> LoginMethod:
    if login_method != LoginMethod.ANY:
        return login_method

    for method in LoginMethod:
        if method.value in secrets:
            return method

    raise ValueError("No matching login method found in secrets")


async def login_to_website(
    task_id: str,
    url: str,
    login_method: LoginMethod,
    secrets: dict[str, dict[str, str]],
    **kwargs: Any,
) -> tuple[dict[str, dict[str, str]], AgentHistoryList]:
    """
    Login to the webapp and return the generated cookies.
    """

    if login_method not in SUPPORTED_LOGIN_METHODS:
        raise ValueError(f"Login method {login_method} not supported")

    login_method = _select_login_method(login_method=login_method, secrets=secrets)

    success, error_message = has_required_secrets(login_method=login_method, secrets=secrets)
    if not success:
        raise ValueError(error_message)

    sensitive_data = {f"{_sec_category}:{_sec_name}": _sec_value for _sec_category, _secrets in secrets.items() for _sec_name, _sec_value in _secrets.items()}

    initialize()

    browser = Browser(
        config=BrowserConfig(
            headless=os.getenv("HEADLESS", "true").lower() == "true",
        )
    )

    context = BrowserContext(browser=browser, config=BrowserContextConfig(
        cookies_file=os.getenv("COOKIES_FILE", None),
        minimum_wait_page_load_time=1,
        viewport_expansion=0,
        wait_between_actions=0,  # Not an env var cause we want to make sure it's always 0
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246",
    ))

    login_methods = []
    if any(LoginMethod.EMAIL.value in k for k in secrets.keys()):
        login_methods.append(f"- {LoginMethod.EMAIL.value}")
    if any(LoginMethod.GOOGLE.value in k for k in secrets.keys()):
        login_methods.append(f"- {LoginMethod.GOOGLE.value}")
    login_methods = "\n".join(login_methods)

    await context.navigate_to(url)  # allowing us to get page html before login
    content_before_login = await (await context.get_current_page()).content()

    extend_agent_history()

    agent = Agent(
        task=PROMPT.format(login_methods=login_methods),
        llm=AGENT_CLIENT,
        sensitive_data=sensitive_data,
        initial_actions=[{'go_to_url': {'url': url}}, {'go_to_url': {'url': url}}],  # twice cause it some case we have a redirect at the first try
        browser_context=context,
        use_vision_for_planner=False,
        use_vision=True,
        enable_memory=False,
    )

    try:
        history = await agent.run(max_steps=15)

        await agent.browser_context.navigate_to(url)
        content_after_login = await (await agent.browser_context.get_current_page()).content()

    except Exception as e:
        raise e

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

    session_data = {"cookies": cookies, "localStorage": localStorage_data}

    logger.info(f"[{task_id}] Checking if agent is logged in")

    if kwargs.get("no_verify", False) is True:
        logger.info(f"[{task_id}] Skipping verification of login status")
        is_logged_in = True
    else:
        is_logged_in = await check_is_logged_in_using_html_diff(
            task_id=task_id,
            before_login_html=content_before_login,
            after_login_html=content_after_login,
        )

    logger.info(f"[{task_id}] Agent is logged in: {is_logged_in}")

    from browser_use.agent.gif import create_history_gif  # import here to avoid thread blocking
    with NamedTemporaryFile(suffix='.gif', delete=True) as temp_gif:
        create_history_gif(
            task="a",
            history=history,
            output_path=temp_gif.name,
            show_task=False,
            show_logo=False,
            show_goals=False
        )

        # Upload GIF to S3
        s3_url = upload_gif_to_s3(
            file_path=temp_gif.name,
            task_id=task_id,
            task_type="auth",
            task_name=url,
        )
        if s3_url:
            logger.info(f"[{task_id}] Auth Session Generation GIF uploaded to S3: {s3_url}")

    if not is_logged_in:
        return None, history

    return session_data, history


def _parse_login_attempt(xml_string: str) -> dict[str, str]:
    """
    Parses the agent's final XML output into a JSON dictionary using regex.
    """
    method_match = re.search(r"<method_used>(.*?)</method_used>", xml_string, re.DOTALL)
    result_match = re.search(r"<login_result>(.*?)</login_result>", xml_string, re.DOTALL)
    error_match = re.search(r"<error_message>(.*?)</error_message>", xml_string, re.DOTALL)

    output = {}
    if method_match:
        output["method_used"] = method_match.group(1).strip()
    if result_match:
        output["login_result"] = result_match.group(1).strip()
    if error_match:
        output["error_message"] = error_match.group(1).strip()

    return output


async def login_to_website_agent(
    task_id: str,
    url: str,
    login_method: LoginMethod,
    secrets: dict[str, dict[str, str]],
) -> tuple[dict[str, dict[str, str]], str]:

    base_ouput = {
        "agent_thoughts": "",
        "agent_actions": "",
    }

    logger.info(f"[{task_id}] Login method: {login_method}")

    if login_method not in SUPPORTED_LOGIN_METHODS:
        logger.info(f"[{task_id}] Login method not supported")
        return base_ouput | {
            "status": TestStatus.AGENT_LIMTATION.value,
            "results": "Login method not supported",
            "tracing": [],
            "error": "Login method not supported",
            "traceback": "",
        }

    session_data, history = await login_to_website(
        task_id=task_id,
        url=url,
        login_method=login_method,
        secrets=secrets,
    )

    # Parse the agent's final result from XML to JSON
    parsed_result = _parse_login_attempt(history.final_result())

    return base_ouput | {
        "agent_thoughts": history.model_thoughts(),
        "agent_actions": history.model_actions(),
        "status": TestStatus.COMPLETED.value if session_data is not None else TestStatus.FAILED.value,
        "results": json.dumps(parsed_result),  # Store parsed result as JSON string
        "tracing": history.get_logs(),
        "error": "" if session_data is not None else parsed_result.get("error_message", "Login failed"),  # Use parsed error
        "traceback": "",
    }
