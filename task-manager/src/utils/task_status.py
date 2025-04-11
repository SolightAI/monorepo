"""
Task Status Manager - Singleton utility for tracking background task status across the application.
"""
import functools
import traceback

from typing import Dict, Any, Optional
from logging import getLogger


logger = getLogger(__name__)


def handle_background_task_errors(func):
    """
    Decorator for background task functions that handles errors and updates task_ids.

    Args:
        func: The async function to wrap. The first argument must be task_id.

    Returns:
        An async function wrapped with error handling that updates task_ids.
    """
    @functools.wraps(func)
    async def wrapper(task_id: str, *args, **kwargs):  # type: ignore
        try:
            return await func(task_id, *args, **kwargs)
        except Exception as e:
            error_message = str(e)
            error_traceback = traceback.format_exc()
            logger.error(f"[{task_id}] Error in background task: {error_message}")
            logger.error(f"[{task_id}] Traceback: {error_traceback}")

            # Update task_ids to indicate failure
            task_status_manager.set_status(
                task_id=task_id,
                status="error",
                error=error_message,
            )

            return None

    return wrapper


class TaskStatusManager:
    """
    Singleton for tracking task statuses across the entire task manager application.
    Provides a centralized way to track the status of long-running background tasks.
    """
    _instance = None

    def __new__(cls) -> "TaskStatusManager":
        if cls._instance is None:
            logger.info("Initializing TaskStatusManager singleton")
            cls._instance = super(TaskStatusManager, cls).__new__(cls)
            cls._instance.tasks = {}
        return cls._instance

    def set_status(self, task_id: str, status: str, results: Optional[Any] = None, error: Optional[Any] = None, agent_thoughts: Optional[Any] = None, agent_actions: Optional[Any] = None) -> None:
        """
        Set the status of a task.

        Args:
            task_id: Unique identifier for the task
            status: Current status (pending, completed, error, etc.)
            results: Optional results from the task
            error: Optional error message if task failed
            agent_thoughts: Optional agent thoughts from the task
            agent_actions: Optional agent actions from the task
        """
        # Convert error to string if it's not None and not a string already
        if error is not None and not isinstance(error, str):
            try:
                error = str(error)
            except Exception as e:
                logger.error(f"Error converting error object to string for task {task_id}: {e}")
                error = "Unknown error (could not convert to string)"

        self.tasks[task_id] = {
            "status": status,
            "results": results,
            "error": error,
            "agent_thoughts": agent_thoughts,
            "agent_actions": agent_actions,
        }
        logger.debug(f"Task {task_id} status set to {status}")

    def get_status(self, task_id: str) -> Dict[str, Any]:
        """
        Get the current status of a task.

        Args:
            task_id: Unique identifier for the task

        Returns:
            Dictionary containing status information
        """
        status = self.tasks.get(task_id, {"status": "unknown", "results": None, "error": None, "agent_thoughts": None, "agent_actions": None})

        # Make sure error is a string
        if status.get("error") is not None and not isinstance(status["error"], str):
            try:
                status["error"] = str(status["error"])
            except Exception as e:
                logger.error(f"Error converting error object to string for task {task_id}: {e}")
                status["error"] = "Unknown error (could not convert to string)"

        logger.debug(f"Retrieved status for task {task_id}: {status['status']}")
        return status


# Initialize the singleton
task_status_manager = TaskStatusManager()
