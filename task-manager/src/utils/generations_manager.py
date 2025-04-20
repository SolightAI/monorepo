import logging
from utils.session_manager import get_redis

logger = logging.getLogger(__name__)

async def set_generations(feature_id: str, task_id: str) -> None:
    """
    Add a task ID to the feature's hash in Generations.
    
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
        await redis_client.hset("Generations", feature_id, task_id)
        logger.info(f"Added task {task_id} to feature {feature_id} generations")
        
    except Exception as e:
        logger.error(f"Error setting generations: {str(e)}")

    
    
