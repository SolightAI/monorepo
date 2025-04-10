"""
Task Status Manager - Singleton utility for tracking background task status across the application.
"""
from typing import Dict, Any, Optional
from logging import getLogger

logger = getLogger(__name__)


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

    def set_status(self, task_id: str, status: str, results: Optional[Any] = None, error: Optional[Any] = None, feature_id: Optional[str] = None) -> None:
        """
        Set the status of a task.

        Args:
            task_id: Unique identifier for the task
            status: Current status (pending, completed, error, etc.)
            results: Optional results from the task
            error: Optional error message if task failed
            feature_id: Optional feature ID associated with the task
        """
        # Convert error to string if it's not None and not a string already
        if error is not None and not isinstance(error, str):
            try:
                error = str(error)
            except Exception as e:
                logger.error(f"Error converting error object to string for task {task_id}: {e}")
                error = "Unknown error (could not convert to string)"

        self.tasks[task_id] = {"status": status, "results": results, "error": error, "feature_id": feature_id}
        logger.debug(f"Task {task_id} status set to {status}")

    def get_status(self, task_id: str) -> Dict[str, Any]:
        """
        Get the current status of a task.

        Args:
            task_id: Unique identifier for the task

        Returns:
            Dictionary containing status information
        """
        status = self.tasks.get(task_id, {"status": "unknown", "results": None, "error": None, "feature_id": None})

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
