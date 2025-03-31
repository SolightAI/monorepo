from typing import Dict, Optional
import logging
import json
import time
import os
import redis.asyncio as redis


DEFAULT_EXPIRATION = 86400


_redis = None
logger = logging.getLogger(__name__)


async def get_redis() -> redis.Redis:
    """Get Redis client instance"""
    global _redis
    if _redis is None:
        _redis = redis.Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", "6379")),
            db=int(os.getenv("REDIS_DB", "0")),
            password=os.getenv("REDIS_PASSWORD", None),
            decode_responses=False
        )
    return _redis


async def get_cached_session(url: str, user_id: str) -> Optional[Dict]:
    """
    Get a cached session for a URL and user_id from Redis
    
    Args:
        url: The website URL
        user_id: User identifier
    
    Returns:
        The cached session data or None
    """
    try:
        redis_client = await get_redis()
        key = f"session:{url}:{user_id}"
        data = await redis_client.get(key)
        
        if not data:
            return None
            
        session_data = json.loads(data)
        logger.info(f"Retrieved session for {url} (user: {user_id})")
        return session_data.get("session_data")
        
    except Exception as e:
        logger.error(f"Error retrieving session: {str(e)}")
        return None


async def cache_session(url: str, user_id: str, session_data: Dict) -> None:
    """
    Cache a session in Redis
    
    Args:
        url: The website URL
        user_id: User identifier
        session_data: Session data to cache
    """
    try:
        redis_client = await get_redis()
        key = f"session:{url}:{user_id}"
        
        data = {
            "session_data": session_data,
            "created_at": time.time()
        }
        
        expiration = int(os.getenv("SESSION_EXPIRATION_SECONDS", DEFAULT_EXPIRATION))
        await redis_client.setex(key, expiration, json.dumps(data))
        logger.info(f"Cached session for {url} (user: {user_id})")
    
    except Exception as e:
        logger.error(f"Error caching session: {str(e)}")


async def update_session_timestamp(url: str, user_id: str) -> None:
    """
    Refresh the expiration time for a session
    
    Args:
        url: The website URL
        user_id: User identifier
    """
    try:
        redis_client = await get_redis()
        key = f"session:{url}:{user_id}"
        
        # Check if session exists
        if not await redis_client.exists(key):
            return
            
        # Reset the expiration time
        expiration = int(os.getenv("SESSION_EXPIRATION_SECONDS", DEFAULT_EXPIRATION))
        await redis_client.expire(key, expiration)
        logger.info(f"Refreshed expiration for session {url} (user: {user_id})")
    
    except Exception as e:
        logger.error(f"Error updating session expiration: {str(e)}")


async def delete_session(url: str, user_id: str) -> bool:
    """
    Delete a session
    
    Args:
        url: The website URL
        user_id: User identifier
    """
    try:
        redis_client = await get_redis()
        key = f"session:{url}:{user_id}"
        result = await redis_client.delete(key)
        return result > 0
    except Exception as e:
        logger.error(f"Error deleting session: {str(e)}")
        return False
