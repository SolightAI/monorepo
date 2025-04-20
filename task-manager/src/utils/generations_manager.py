import logging
from utils.session_manager import get_redis

logger = logging.getLogger(__name__)

async def set_generations(feature_id: str, task_id: str) -> None:
    """
    Add a task ID to the feature's hash in Redis.
    
    Args:
        feature_id: The ID of the feature
        task_id: The ID of the task to add
    """
    try:
        redis_client = await get_redis()
        if redis_client is None:
            logger.warning("Redis not available, cannot set generations")
            return
            
        # Add the task_id to the feature's hash
        await redis_client.hset("generations", feature_id, task_id)
        logger.info(f"Added task {task_id} to feature {feature_id} generations")
        
    except Exception as e:
        logger.error(f"Error setting generations: {str(e)}")
        raise  # Re-raise the exception to handle it in the calling function

async def get_generations(feature_id: str) -> str | None:
    """
    Get the task ID for a feature from Redis.
    
    Args:
        feature_id: The ID of the feature
        
    Returns:
        The task ID if found, None otherwise
    """
    try:
        redis_client = await get_redis()
        if redis_client is None:
            logger.warning("Redis not available, cannot get generations")
            return None
            
        task_id = await redis_client.hget("generations", feature_id)
        if task_id:
            return task_id.decode('utf-8') if isinstance(task_id, bytes) else task_id
        return None
        
    except Exception as e:
        logger.error(f"Error getting generations: {str(e)}")
        return None

async def clear_generations(feature_id: str) -> None:
    """
    Remove the task ID for a feature from Redis.
    
    Args:
        feature_id: The ID of the feature
    """
    try:
        redis_client = await get_redis()
        if redis_client is None:
            logger.warning("Redis not available, cannot clear generations")
            return
            
        await redis_client.hdel("generations", feature_id)
        logger.info(f"Removed task ID for feature {feature_id} from generations")
        
    except Exception as e:
        logger.error(f"Error clearing generations: {str(e)}")
        raise  # Re-raise the exception to handle it in the calling function

    
    
