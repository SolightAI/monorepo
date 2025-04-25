import os
import asyncio
import logging
from arq import create_pool
from arq.connections import RedisSettings, ArqRedis

logger = logging.getLogger(__name__)


class RedisManager:
    _instance = None
    _pool: ArqRedis | None = None
    _lock = asyncio.Lock()

    def __new__(cls) -> 'RedisManager':
        if cls._instance is None:
            cls._instance = super(RedisManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return
        self.redis_host = os.getenv("REDIS_HOST")
        self.redis_port = os.getenv("REDIS_PORT")
        if not self.redis_host or not self.redis_port:
            raise ValueError("REDIS_HOST and REDIS_PORT environment variables must be set.")
        self.redis_settings = RedisSettings(host=self.redis_host, port=int(self.redis_port))
        self._initialized = True

    async def get_pool(self) -> ArqRedis:
        """Get the existing pool or create a new one if it doesn't exist."""
        if self._pool is None:
            async with self._lock:
                # Double-check locking
                if self._pool is None:
                    logger.info("Creating new Redis connection pool.")
                    self._pool = await create_pool(self.redis_settings)
        # Ensure the pool is healthy, arq might handle this, but a check doesn't hurt
        # In a real scenario, you might add a ping or health check here
        if self._pool is None:
            # This should ideally not happen due to the logic above, but defensively handle it.
            raise ConnectionError("Failed to create or retrieve Redis pool.")
        return self._pool

    async def close_pool(self) -> None:
        """Close the Redis pool if it exists."""
        if self._pool:
            async with self._lock:
                if self._pool:
                    logger.info("Closing Redis connection pool.")
                    await self._pool.close()
                    self._pool = None


async def get_redis_pool() -> ArqRedis:
    manager = RedisManager()
    return await manager.get_pool()


async def close_redis_pool() -> None:
    manager = RedisManager()
    await manager.close_pool()
