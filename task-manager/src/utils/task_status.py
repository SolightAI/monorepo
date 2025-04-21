"""
Task Status Manager - Singleton utility for tracking background task status across the application.
"""
import functools
import traceback
import json

from typing import Dict, Any, List
from logging import getLogger
from utils.session_manager import get_redis
from pydantic import BaseModel


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
            await task_status_manager.set_status(
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
        return cls._instance

    def _serialize_results(self, results: Any) -> Any:
        """
        Serialize results for Redis storage.
        
        Args:
            results: The results to serialize
            
        Returns:
            Serialized results
        """
        if results is None:
            return None
            
        if isinstance(results, list):
            serialized = []
            for item in results:
                if isinstance(item, BaseModel):
                    serialized.append(item.model_dump())
                else:
                    # Handle non-serializable objects by converting to string
                    try:
                        # Try to serialize normally first
                        json.dumps(item)
                        serialized.append(item)
                    except (TypeError, OverflowError):
                        # If serialization fails, convert to string
                        serialized.append(str(item))
            return serialized
            
        if isinstance(results, BaseModel):
            return results.model_dump()
            
        # Handle non-serializable objects by converting to string
        try:
            # Try to serialize normally first
            json.dumps(results)
            return results
        except (TypeError, OverflowError):
            # If serialization fails, convert to string
            return str(results)

    async def set_status(self, task_id: str, status: str, **kwargs) -> None:
        """
        Set the status of a task.

        Args:
            task_id: Unique identifier for the task
            status: Current status (pending, completed, error, etc.)
            results: Optional results from the task
            error: Optional error message if task failed
            agent_thoughts: Optional agent thoughts from the task
            agent_actions: Optional agent actions from the task
            evidence: Optional list of evidence URLs (e.g., GIF URL)
        """

        error = kwargs.get("error")

        # Convert error to string if it's not None and not a string already
        if error is not None and not isinstance(error, str):
            try:
                error = str(error)
            except Exception as e:
                logger.error(f"Error converting error object to string for task {task_id}: {e}")
                error = "Unknown error (could not convert to string)"

        # Serialize results if they exist
        results = kwargs.get("results")
        if results is not None:
            results = self._serialize_results(results)

        # Serialize agent_thoughts if they exist
        agent_thoughts = kwargs.get("agent_thoughts")
        if agent_thoughts is not None:
            agent_thoughts = self._serialize_results(agent_thoughts)

        # Serialize agent_actions if they exist
        agent_actions = kwargs.get("agent_actions")
        if agent_actions is not None:
            agent_actions = self._serialize_results(agent_actions)

        # Serialize evidence if it exists
        evidence = kwargs.get("evidence")
        if evidence is not None:
            evidence = self._serialize_results(evidence)

        task_data = {
            "status": status,
            "results": results,
            "error": error,
            "agent_thoughts": agent_thoughts,
            "agent_actions": agent_actions,
            "feature_id": kwargs.get("feature_id"),
            "evidence": evidence,
        }

        try:
            redis_client = await get_redis()
            if redis_client is None:
                logger.warning("Redis not available, cannot set task status")
                return
                
            await redis_client.hset("task_statuses", task_id, json.dumps(task_data))
            logger.info(f"Task {task_id} status set to {status}")
        except Exception as e:
            logger.error(f"Error setting task status in Redis: {str(e)}")

    async def get_status(self, task_id: str) -> Dict[str, Any]:
        """
        Get the current status of a task.

        Args:
            task_id: Unique identifier for the task

        Returns:
            Dictionary containing status information
        """
        try:
            redis_client = await get_redis()
            if redis_client is None:
                logger.warning("Redis not available, cannot get task status")
                return {"status": "unknown", "results": None, "error": None, "agent_thoughts": None, "agent_actions": None, "feature_id": None, "evidence": None}
                
            status_data = await redis_client.hget("task_statuses", task_id)
            if status_data:
                status = json.loads(status_data)
            else:
                status = {"status": "unknown", "results": None, "error": None, "agent_thoughts": None, "agent_actions": None, "feature_id": None, "evidence": None}

            # Make sure error is a string
            if status.get("error") is not None and not isinstance(status["error"], str):
                try:
                    status["error"] = str(status["error"])
                except Exception as e:
                    logger.error(f"Error converting error object to string for task {task_id}: {e}")
                    status["error"] = "Unknown error (could not convert to string)"

            logger.info(f"Retrieved status for task {task_id}: {status['status']}")
            return status
        except Exception as e:
            logger.error(f"Error getting task status from Redis: {str(e)}")
            return {"status": "unknown", "results": None, "error": None, "agent_thoughts": None, "agent_actions": None, "feature_id": None, "evidence": None}


# Initialize the singleton
task_status_manager = TaskStatusManager()
