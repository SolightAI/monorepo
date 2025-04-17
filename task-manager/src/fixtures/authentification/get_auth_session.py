from logging import getLogger
from utils.session_manager import get_cached_session, cache_session, update_session_timestamp
from fixtures.authentification.login_to_website import login_to_website
from fixtures.authentification.check_if_is_logged_in import check_is_logged_in
from fixtures.authentification.has_required_secrets import LoginMethod


logger = getLogger(__name__)


def get_user_id(secrets: dict[str, dict[str, str]]) -> str | None:
    if LoginMethod.EMAIL.value in secrets and "username" in secrets[LoginMethod.EMAIL.value]:
        return secrets[LoginMethod.EMAIL.value]["username"]
    elif LoginMethod.GOOGLE.value in secrets and "username" in secrets[LoginMethod.GOOGLE.value]:
        return secrets[LoginMethod.GOOGLE.value]["username"]
    return None


async def get_auth_session(
    task_id: str,
    url: str,
    secrets: dict[str, dict[str, str]],
    reuse_session: bool = True,
) -> tuple[dict[str, dict[str, str]], str]:

    """
    Login to the webapp and return the generated cookies.
    If reuse_session is True, will attempt to reuse cached sessions if they're still valid.
    """

    user_id = get_user_id(secrets)

    # First check if we can reuse a cached session
    if user_id and reuse_session:
        cached_session = await get_cached_session(url, user_id)
        if cached_session:
            logger.info(f"[{task_id}] Found cached session for {url} (user: {user_id}), checking if still valid...")
            if await check_is_logged_in(task_id, url, cached_session):
                logger.info(f"[{task_id}] Cached session for user {user_id} is still valid, reusing it")
                await update_session_timestamp(url, user_id)
                return cached_session
            else:
                logger.info(f"[{task_id}] Cached session for user {user_id} is no longer valid, generating a new one")
        else:
            logger.info(f"[{task_id}] No cached session found for {url} (user: {user_id}), generating a new one")

    session_data, history, _ = await login_to_website(task_id, url, LoginMethod.ANY, secrets)

    if session_data is None:
        raise RuntimeError(f"Login failed for {url}: {history.final_result()}")

    # Cache the new session for future use
    await cache_session(url, user_id, session_data)

    return session_data
