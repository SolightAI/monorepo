from typing import Dict, Optional
import logging
import json
import time
import os
from .redis_client import get_redis


DEFAULT_EXPIRATION = 86400


logger = logging.getLogger(__name__)


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
        if redis_client is None:
            logger.warning("Redis not available, cannot retrieve cached session")
            return None

        key = f"session:{url}:{user_id}"
        data_bytes = await redis_client.get(key)

        if not data_bytes:
            return None

        session_data = json.loads(data_bytes.decode('utf-8'))
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
        if redis_client is None:
            logger.warning("Redis not available, session will not be cached")
            return

        key = f"session:{url}:{user_id}"

        data = {
            "session_data": session_data,
            "created_at": time.time()
        }

        expiration = int(os.getenv("SESSION_EXPIRATION_SECONDS", DEFAULT_EXPIRATION))
        await redis_client.setex(key, expiration, json.dumps(data).encode('utf-8'))
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
        if redis_client is None:
            logger.warning("Redis not available, cannot update session timestamp")
            return

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
        if redis_client is None:
            logger.warning("Redis not available, cannot delete session")
            return False

        key = f"session:{url}:{user_id}"
        result = await redis_client.delete(key)
        return result > 0
    except Exception as e:
        logger.error(f"Error deleting session: {str(e)}")
        return False
