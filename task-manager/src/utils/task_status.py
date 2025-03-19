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
    
    def __new__(cls):
        if cls._instance is None:
            logger.info("Initializing TaskStatusManager singleton")
            cls._instance = super(TaskStatusManager, cls).__new__(cls)
            cls._instance.tasks = {}
        return cls._instance
    
    def set_status(self, task_id: str, status: str, results: Optional[Any] = None, error: Optional[str] = None) -> None:
        """
        Set the status of a task.
        
        Args:
            task_id: Unique identifier for the task
            status: Current status (pending, completed, error, etc.)
            results: Optional results from the task
            error: Optional error message if task failed
        """
        self.tasks[task_id] = {"status": status, "results": results, "error": error}
        logger.debug(f"Task {task_id} status set to {status}")
    
    def get_status(self, task_id: str) -> Dict[str, Any]:
        """
        Get the current status of a task.
        
        Args:
            task_id: Unique identifier for the task
            
        Returns:
            Dictionary containing status information
        """
        status = self.tasks.get(task_id, {"status": "unknown", "results": None, "error": None})
        logger.debug(f"Retrieved status for task {task_id}: {status['status']}")
        return status


# Initialize the singleton
task_status_manager = TaskStatusManager() 