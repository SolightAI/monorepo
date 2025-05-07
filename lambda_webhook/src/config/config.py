from typing import TypedDict

from src.config import env


class Config(TypedDict):
    redis_host: str
    redis_port: int
    redis_db: int
    redis_password: str | None


def get() -> Config:
    return {
        "redis_host": env.get_string("REDIS_HOST"),
        "redis_port": env.get_int("REDIS_PORT"),
        "redis_db": env.get_int("REDIS_DB"),
        "redis_password": env.get_string("REDIS_PASSWORD", required=False),
    }
