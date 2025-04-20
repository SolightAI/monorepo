import logging
from .redis_client import redis_manager

logger = logging.getLogger(__name__)


async def get_generations(feature_id: str) -> str | None:
    """
    Get task ID for a specific feature from Generations.
    
    Args:
        feature_id: Feature ID to get task for
      
    Returns:
        Task ID for the feature or None if not found
    """
    try:
        redis_client = redis_manager.get_client()
        if redis_client is None:
            logger.warning("Redis not available, cannot get generations")
            return None
        task_id = redis_client.hget("generations", feature_id)
        if task_id:
            return task_id.decode('utf-8') if isinstance(task_id, bytes) else task_id
        else:
            return None
    except Exception as e:
        logger.error(f"Error getting generations: {str(e)}")
        return None

async def clear_generations(feature_id: str) -> bool:
    """
    Remove task ID for a specific feature from Redis.
    
    Args:
        feature_id: Feature ID to clear task for
      
    Returns:
        True if successful, False otherwise
    """
    try:
        redis_client = redis_manager.get_client()
        if redis_client is None:
            logger.warning("Redis not available, cannot clear generations")
            return False
            
        # Remove the task_id for the feature_id
        redis_client.hdel("generations", feature_id)
        logger.info(f"Cleared task ID for feature {feature_id} from Redis")
        return True
    except Exception as e:
        logger.error(f"Error clearing generations: {str(e)}")
        return False








