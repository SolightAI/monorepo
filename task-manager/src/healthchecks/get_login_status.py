from fixtures.authentification.check_if_is_logged_in import check_is_logged_in
from utils.dto import Test


def get_login_status(
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

    return check_is_logged_in(
        task_id=task_id,
        url=test.url,
        existing_session=existing_session,
    )
