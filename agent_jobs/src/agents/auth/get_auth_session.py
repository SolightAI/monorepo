import json

from typing import Any
from logging import getLogger

from src.config import Config

from .login_to_website import login_to_website
from .check_if_is_logged_in import check_is_logged_in
from .has_required_secrets import LoginMethod


logger = getLogger(__name__)


def get_user_id(secrets: list[dict[str, Any]]) -> str | None:
    for secret in secrets:
        if (
            secret["category"] == LoginMethod.EMAIL.value
            and "username" in secret["values"]
        ):
            return secret["values"]["username"]

        elif (
            secret["category"] == LoginMethod.GOOGLE_OAUTH.value
            and "username" in secret["values"]
        ):
            return secret["values"]["username"]

    return None


async def get_auth_session(
    config: Config,
    task_id: str,
    url: str,
    secrets: list[dict[str, Any]],
    reuse_session: bool = True,
) -> dict[str, dict[str, str]]:
    """
    Login to the webapp and return the generated cookies.
    If reuse_session is True, will attempt to reuse cached sessions if they're still valid.
    """

    user_id = get_user_id(secrets)
    cache_key = f"session:{url}:{user_id}"

    # First check if we can reuse a cached session
    if user_id and reuse_session:
        cached_session = config.redis.get(cache_key, dict[str, dict[str, str]])
        if cached_session:
            logger.info(
                f"[{task_id}] Found cached session for {url} (user: {user_id}), checking if still valid..."
            )
            if await check_is_logged_in(config, task_id, url, cached_session):
                logger.info(
                    f"[{task_id}] Cached session for user {user_id} is still valid, reusing it"
                )
                config.redis.update_ttl(cache_key)
                return cached_session
            else:
                logger.info(
                    f"[{task_id}] Cached session for user {user_id} is no longer valid, generating a new one"
                )
        else:
            logger.info(
                f"[{task_id}] No cached session found for {url} (user: {user_id}), generating a new one"
            )

    session_data, history, *_ = await login_to_website(
        config,
        task_id,
        url,
        LoginMethod.ANY,
        secrets,
    )

    if session_data is None:
        raise RuntimeError(f"Login failed for {url}: {history.final_result()}")

    # Cache the new session for future use
    if user_id:
        config.redis.set(cache_key, json.dumps(session_data))

    return session_data
