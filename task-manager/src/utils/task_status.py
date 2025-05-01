"""
Task Status Manager - Singleton utility for tracking background task status across the application using Redis.
"""
import functools
import traceback
import json
import logging
from typing import Any, Optional, Callable

# Use the shared redis client utility
from utils.redis_client import get_redis
from utils.dto import TestStatus

logger = logging.getLogger(__name__)


DEFAULT_TASK_EXPIRATION = 60 * 10  # 10 minutes


def handle_background_task_errors(func: Callable) -> Callable:
    """
    Decorator for background task functions that handles errors and updates task status in Redis.

    Args:
        func: The async function to wrap. The first argument must be task_id.

    Returns:
        An async function wrapped with error handling that updates task status.
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

            # Update task status in Redis to indicate failure
            # Use the singleton instance directly
            await task_status_manager.set_status(
                task_id=task_id,
                status=TestStatus.ERROR.value,
                error=error_message,
            )

            return None

    return wrapper


class TaskStatusManager:
    """
    Singleton for tracking task statuses in Redis.
    Provides a centralized way to track the status of long-running background tasks.
    """
    _instance: Optional["TaskStatusManager"] = None

    def __new__(cls) -> "TaskStatusManager":
        if cls._instance is None:
            logger.info("Initializing TaskStatusManager singleton")
            cls._instance = super(TaskStatusManager, cls).__new__(cls)
            # No in-memory task dictionary needed anymore
        return cls._instance

    def _get_redis_key(self, task_id: str) -> str:
        """Helper method to generate the Redis key for a task."""
        return f"task_status:{task_id}"

    async def set_status(self, task_id: str, status: str, **kwargs: Any) -> None:
        """
        Set the status of a task in Redis.

        Args:
            task_id: Unique identifier for the task
            status: Current status (pending, completed, error, etc.)
            **kwargs: Additional data (results, error, agent_thoughts, etc.)
        """
        redis_client = await get_redis()
        if redis_client is None:
            logger.error(f"Redis not available. Cannot set status for task {task_id}")
            # Potentially raise an error or handle this case appropriately
            return

        key = self._get_redis_key(task_id)

        error = kwargs.get("error")
        if error is not None and not isinstance(error, str):
            try:
                error = str(error)
            except Exception as e:
                logger.error(f"Error converting error object to string for task {task_id}: {e}")
                error = "Unknown error (could not convert to string)"

        task_data = {
            "status": status,
            "results": kwargs.get("results"),
            "error": error,
            "agent_thoughts": kwargs.get("agent_thoughts"),
            "agent_actions": kwargs.get("agent_actions"),
            "feature_id": kwargs.get("feature_id"),
            "evidence": kwargs.get("evidence"),
        }

        try:
            # Serialize data to JSON string and encode to bytes
            data_json = json.dumps(task_data)
            data_bytes = data_json.encode("utf-8")

            # Set the value in Redis with an expiration time
            await redis_client.setex(key, DEFAULT_TASK_EXPIRATION, data_bytes)
            logger.debug(f"Task {task_id} status set to {status} in Redis")
        except Exception as e:
            logger.error(f"Error setting status for task {task_id} in Redis: {e}")

    async def get_status(self, task_id: str) -> dict[str, Any]:
        """
        Get the current status of a task from Redis.

        Args:
            task_id: Unique identifier for the task

        Returns:
            Dictionary containing status information, or a default 'unknown' status.
        """
        default_status = {
            "status": TestStatus.UNKNOWN.value,
            "results": None,
            "error": None,
            "agent_thoughts": None,
            "agent_actions": None,
            "feature_id": None,
            "evidence": None
        }

        redis_client = await get_redis()

        if redis_client is None:
            logger.warning(f"Redis not available. Cannot get status for task {task_id}")
            return default_status

        key = self._get_redis_key(task_id)

        try:
            data_bytes = await redis_client.get(key)

            if data_bytes is None:
                logger.warning(f"No status found in Redis for task {task_id}")
                return default_status

            # Decode bytes to string and parse JSON
            data_json = data_bytes.decode("utf-8")
            status_data = json.loads(data_json)

            # Ensure error is a string (redundant check if set_status handles it, but safe)
            if status_data.get("error") is not None and not isinstance(status_data["error"], str):
                try:
                    status_data["error"] = str(status_data["error"])
                except Exception as e:
                    logger.error(f"Error converting retrieved error object to string for task {task_id}: {e}")
                    status_data["error"] = "Unknown error (could not convert to string)"

            logger.debug(f"Retrieved status for task {task_id} from Redis: {status_data.get('status')}")
            return status_data

        except json.JSONDecodeError as e:
            logger.error(f"Error decoding JSON status for task {task_id} from Redis: {e}. Data: {data_bytes!r}")
            return {**default_status, "status": "error", "error": "Failed to decode status from storage"}
        except Exception as e:
            logger.error(f"Error getting status for task {task_id} from Redis: {e}")
            return {**default_status, "status": "error", "error": "Failed to retrieve status from storage"}


# Initialize the singleton
task_status_manager = TaskStatusManager()
