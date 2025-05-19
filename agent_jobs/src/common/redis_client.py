import json
import logging

from typing import Type, TypeVar
from redis import Redis

T = TypeVar("T")

logger = logging.getLogger(__name__)


class RedisClient:
    _client: Redis
    _default_ttl: int

    def __init__(
        self,
        host: str,
        port: int,
        db: int,
        password: str | None = None,
        default_ttl: int = 86400,
    ) -> None:        
        self._client = Redis(host=host, port=port, db=db, password=password)
        self._default_ttl = default_ttl

        if self._client.ping() is False:
            raise Exception("Cannot ping redis, check your configuration")

    def client(self) -> Redis:
        return self._client

    def close(self) -> None:
        self._client.close()

    def get(self, key: str, model: Type[T]) -> T | None:
        try:
            value = self._client.get(key)
            if value is None:
                return None

            data = json.loads(value)

            return model(**data)
        except Exception as e:
            logger.error(f"Error getting key {key} from Redis: {e}")
            return None

    def set(self, key: str, value: str, ttl: int | None = None) -> None:
        try:
            if ttl is None:
                ttl = self._default_ttl

            self._client.set(key, value, ex=ttl)
        except Exception as e:
            logger.error(f"Error setting key {key} in Redis: {e}")

    def update_ttl(self, key: str, ttl: int | None = None) -> None:
        if ttl is None:
            ttl = self._default_ttl

        try:
            self._client.expire(key, ttl)
        except Exception as e:
            logger.error(f"Error setting ttl for key {key} in Redis: {e}")

    def ping(self) -> bool:
        return self._client.ping()
