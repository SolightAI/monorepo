import logging

from typing import Optional, Any
from browser_use.agent.views import AgentHistoryList


logger = logging.getLogger(__name__)


async def validate_agent_history(
    history: AgentHistoryList,
    task_name: str,
    error_markers: Optional[list[str]] = None,
    empty_result_is_ok: bool = False
) -> Any:
    """
    Validate the history of an agent run and extract the final result.

    Args:
        history: The agent history object from the run
        task_name: Name of the task being performed (e.g., "login", "generate features")
        error_markers: Optional list of strings in the result that indicate an error

    Returns:
        The final result from the history

    Raises:
        Exception: If the history validation fails for any reason
    """

    if error_markers is not None and not isinstance(error_markers, list):
        raise ValueError("error_markers must be a list")

    result = history.final_result()

    # Check if the task completed
    if not history.is_done():
        error_msg = f"Failed to {task_name}, history is not done"
        logger.error(error_msg)
        raise Exception(error_msg)

    # Check if the task was successful
    if not history.is_successful():
        error_msg = f"Failed to {task_name}, history is not successful"
        logger.error(error_msg)

        raise Exception(error_msg)

    # Check if the result is empty and empty_result_is_ok is False
    if not empty_result_is_ok and result is None:
        error_msg = f"Failed to {task_name}, result is None"
        logger.error(error_msg)
        raise Exception(error_msg)

    # Check for custom error marker in the result
    if error_markers is not None:
        for error_marker in error_markers:
            if result is not None and error_marker in result:
                error_msg = f"Failed to {task_name}, {error_marker} found in result"
                logger.error(error_msg)
                raise Exception(error_msg)

    return result
