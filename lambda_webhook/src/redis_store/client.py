import json
from typing import Type, TypeVar
from redis import Redis
from src.config.config import Config

T = TypeVar("T")


class RedisClient:
    _instance = None
    _initialized: bool = False

    _client: Redis

    def __init__(self, config: Config) -> None:
        if self._initialized is True:
            return

        self._client = Redis(
            host=config["redis_host"],
            port=config["redis_port"],
            db=config["redis_db"],
            password=config["redis_password"],
        )
        self._initialized = True

    def client(self) -> Redis:
        if self._client is None:
            raise Exception("Redis client connection not initialized")
        return self._client

    def close(self) -> None:
        if self._client is not None:
            self._client.close()

    def get(self, key: str, model: Type[T]) -> T | None:
        value = self._client.get(key)
        if value is None:
            return None

        data = json.loads(value)

        return model(**data)

    def set(self, key: str, value: str, ttl: int = 1 * 60 * 60) -> None:
        self._client.set(key, value, ex=ttl)


# Singleton instance of the redis client
redis_client: RedisClient | None = None


def init(config: Config) -> None:
    global redis_client
    redis_client = RedisClient(config=config)


def redis() -> RedisClient:
    if redis_client is None:
        raise Exception("Redis client not initialized")

    return redis_client


def close() -> None:
    global redis_client

    if redis_client is not None:
        redis_client.close()
        redis_client = None
