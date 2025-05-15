from ..auth.check_if_is_logged_in import check_is_logged_in

from src.config import Config
from src.common.dto import Test


async def get_login_status(
    config: Config,
    task_id: str,
    test: Test,
    existing_session: dict[str, dict[str, str]],
) -> bool:
    """Get the login status of the agent

    Args:
        task_id (str): The id of the task
        url (str): The url of the webapp
        existing_session (dict[str, dict[str, str]]): The existing session of the webapp

    Returns:
        bool: True if the agent is logged in, False otherwise
    """

    return await check_is_logged_in(
        config=config,
        task_id=task_id,
        url=test.url,
        existing_session=existing_session,
    )
