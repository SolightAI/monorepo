from typing import Any
from logging import getLogger
from browser_use import AgentHistoryList

from src.config import Config

from ..base_agent import run_agent
from ..utils import format_secrets

from .check_if_is_logged_in import check_is_logged_in
from .has_required_secrets import (
    has_required_secrets,
    LoginMethod,
    SUPPORTED_LOGIN_METHODS,
)


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
""".strip().format(
    USERNAME_PASSWORD=LoginMethod.EMAIL.value,
    GOOGLE_OAUTH=LoginMethod.GOOGLE_OAUTH.value,
)


logger = getLogger(__name__)


def _select_login_method(
    login_method: LoginMethod, secrets: list[dict[str, dict[str, str]]]
) -> LoginMethod:
    if login_method != LoginMethod.ANY:
        return login_method

    for method in LoginMethod:
        if method.value in [_secret.get("category") for _secret in secrets]:
            return method

    raise ValueError(f"No matching login method found in secrets: {secrets}")


async def login_to_website(
    config: Config,
    identifier: str,
    task_id: str,
    url: str,
    login_method: LoginMethod,
    secrets: list[dict[str, Any]],
    **kwargs: Any,
) -> tuple[dict[str, dict[str, str]] | None, AgentHistoryList, list[str], bool]:
    """
    Login to the webapp and return the generated cookies.

    Args:
        identifier: The identifier of the agent.
        task_id: The task id of the agent.
        url: The url of the webapp.
        login_method: The login method to use.
        secrets: The secrets to use.
        **kwargs: Any additional arguments.

    Returns:
        A tuple containing the session data, history, evidences and a boolean indicating if the agent was run from cache.
    """

    evidences = []

    if login_method not in SUPPORTED_LOGIN_METHODS:
        raise ValueError(f"Login method {login_method} not supported")

    login_method = _select_login_method(login_method=login_method, secrets=secrets)

    success, error_message = has_required_secrets(
        login_method=login_method, secrets=secrets
    )
    if not success:
        raise ValueError(error_message)

    sensitive_data = format_secrets(secrets)

    login_methods = []
    if any(LoginMethod.EMAIL.value in _secret["category"] for _secret in secrets):
        login_methods.append(f"- {LoginMethod.EMAIL.value}")
    if any(
        LoginMethod.GOOGLE_OAUTH.value in _secret["category"] for _secret in secrets
    ):
        login_methods.append(f"- {LoginMethod.GOOGLE_OAUTH.value}")

    session_data, history, evidences, is_from_cache = await run_agent(
        config,
        identifier=identifier,
        task_id=task_id,
        url=url,
        prompt=PROMPT.format(login_methods="\n".join(login_methods)),
        sensitive_data=sensitive_data,
        auth_session=None,
        tools=[],
        **kwargs,
    )

    logger.info(f"[{task_id}] Checking if agent is logged in")

    if kwargs.get("no_verify", False) is True:
        logger.info(f"[{task_id}] Skipping verification of login status")
        is_logged_in = True
    else:
        is_logged_in = await check_is_logged_in(
            config,
            task_id=task_id,
            url=url,
            existing_session=session_data,
        )

    logger.info(f"[{task_id}] Agent is logged in: {is_logged_in}")

    if not is_logged_in:
        return None, history, evidences, is_from_cache

    return session_data, history, evidences, is_from_cache
