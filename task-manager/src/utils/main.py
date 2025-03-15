import os

from redis import Redis


if (redis_host := os.getenv('REDIS_HOST')) is None:
    raise ValueError('REDIS_HOST is not set')

if (redis_port := os.getenv('REDIS_PORT')) is None:
    raise ValueError('REDIS_PORT is not set')


redis_client = Redis(host=redis_host, port=int(redis_port), db=0)
