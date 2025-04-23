import os
import logging
from typing import Optional
import redis.exceptions as redis_exceptions
import redis.asyncio as redis

logger = logging.getLogger(__name__)


class RedisClientManager:
    """Singleton class to manage the Redis client connection."""
    _instance: Optional["RedisClientManager"] = None
    _redis_client: Optional[redis.Redis] = None

    def __new__(cls) -> "RedisClientManager":
        if cls._instance is None:
            logger.info("Initializing RedisClientManager singleton")
            cls._instance = super(RedisClientManager, cls).__new__(cls)
            cls._redis_client = None  # Initialize client as None
        return cls._instance

    async def get_client(self) -> Optional[redis.Redis]:
        """Gets the Redis client, initializing the connection if necessary."""
        if self._redis_client is None:
            try:
                redis_host = os.getenv("REDIS_HOST", "localhost")
                redis_port = int(os.getenv("REDIS_PORT", "6379"))
                redis_db = int(os.getenv("REDIS_DB", "0"))
                redis_password = os.getenv("REDIS_PASSWORD", None)

                logger.info(f"Attempting to connect to Redis at {redis_host}:{redis_port}/{redis_db}")

                self._redis_client = redis.Redis(
                    host=redis_host,
                    port=redis_port,
                    db=redis_db,
                    password=redis_password,
                    decode_responses=False,  # Store bytes, handle encoding/decoding manually
                    socket_connect_timeout=2.0,  # 2 seconds timeout for connection
                    socket_timeout=2.0,  # 2 seconds timeout for operations
                )
                # Test the connection
                await self._redis_client.ping()
                logger.info("Redis connection successful.")
            except redis_exceptions.ConnectionError as e:
                logger.warning(f"Redis connection failed: {str(e)}. Is Redis running at {os.getenv('REDIS_HOST', 'localhost')}:{os.getenv('REDIS_PORT', '6379')}?")
                self._redis_client = None  # Ensure client is None if connection fails
            except Exception as e:
                logger.warning(f"An unexpected error occurred during Redis connection: {str(e)}")
                self._redis_client = None  # Ensure client is None if connection fails

        return self._redis_client

    async def close_client(self) -> None:
        """Closes the Redis connection pool if it exists."""
        if self._redis_client:
            try:
                await self._redis_client.close()
                # Attempt to disconnect the pool as well
                if hasattr(self._redis_client, 'connection_pool'):
                    await self._redis_client.connection_pool.disconnect()
                logger.info("Redis connection closed.")
            except Exception as e:
                logger.error(f"Error closing Redis connection: {e}")
            finally:
                self._redis_client = None


# Instantiate the singleton
redis_client_manager = RedisClientManager()


# Convenience functions (optional, but can maintain backward compatibility)
async def get_redis() -> Optional[redis.Redis]:
    return await redis_client_manager.get_client()


async def close_redis() -> None:
    await redis_client_manager.close_client()
