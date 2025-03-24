from typing import Dict, Optional, Tuple
import asyncio
import logging

logger = logging.getLogger(__name__)

# Global session cache
# Structure: { ("url", "user_id"): {"session_data": {...}, "last_used_timestamp": timestamp} }
_session_cache: Dict[Tuple[str, str], Dict] = {}
_cache_lock = asyncio.Lock()

# Time in seconds after which we'll attempt to validate a session even if it exists
SESSION_VALIDATION_INTERVAL = 300  # 5 minutes


async def get_cached_session(url: str, user_id: str) -> Optional[Dict]:
    """
    Get a cached session for a URL and user_id if one exists and is recent enough

    Args:
        url: The website URL
        user_id: Unique identifier for the user (e.g., username, email, or other identifier)

    Returns:
        The cached session data or None if no valid cache exists
    """
    cache_key = (url, user_id)

    async with _cache_lock:
        if cache_key in _session_cache:
            import time
            current_time = time.time()
            last_used = _session_cache[cache_key].get("last_used_timestamp", 0)

            # If session was used recently, return it without validation
            if current_time - last_used < SESSION_VALIDATION_INTERVAL:
                logger.info(f"Using cached session for {url} (user: {user_id}) - used {current_time - last_used:.1f}s ago")
                return _session_cache[cache_key]["session_data"]

            # If session exists but hasn't been used recently, it will be validated by the caller
            logger.info(f"Cached session for {url} (user: {user_id}) exists but needs validation (last used {current_time - last_used:.1f}s ago)")
            return _session_cache[cache_key]["session_data"]

    return None


async def cache_session(url: str, user_id: str, session_data: Dict) -> None:
    """
    Cache a session for future use

    Args:
        url: The website URL
        user_id: Unique identifier for the user
        session_data: The session data to cache
    """
    cache_key = (url, user_id)

    async with _cache_lock:
        import time
        _session_cache[cache_key] = {
            "session_data": session_data,
            "last_used_timestamp": time.time()
        }
        logger.info(f"Cached new session for {url} (user: {user_id})")


async def update_session_timestamp(url: str, user_id: str) -> None:
    """
    Update the last used timestamp for a session

    Args:
        url: The website URL
        user_id: Unique identifier for the user
    """
    cache_key = (url, user_id)

    async with _cache_lock:
        if cache_key in _session_cache:
            import time
            _session_cache[cache_key]["last_used_timestamp"] = time.time()
            logger.info(f"Updated timestamp for cached session at {url} (user: {user_id})")
