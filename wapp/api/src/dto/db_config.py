import os


def _get_db_config():

    POSTGRES_USER = os.getenv("POSTGRES_USER")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
    POSTGRES_HOST = os.getenv("POSTGRES_HOST")
    POSTGRES_PORT = int(os.getenv("POSTGRES_PORT"))
    POSTGRES_DB = os.getenv("POSTGRES_DB")

    if POSTGRES_USER is None:
        raise ValueError("POSTGRES_USER env variable is not defined")

    if POSTGRES_PASSWORD is None:
        raise ValueError("POSTGRES_PASSWORD env variable is not defined")

    if POSTGRES_HOST is None:
        raise ValueError("POSTGRES_HOST env variable is not defined")

    if POSTGRES_PORT is None:
        raise ValueError("POSTGRES_PORT env variable is not defined")

    if POSTGRES_DB is None:
        raise ValueError("POSTGRES_DB env variable is not defined")

    return {
        'connections': {
            'default': {
                'engine': 'tortoise.backends.asyncpg',
                'credentials': {
                    'host': POSTGRES_HOST,
                    'port': POSTGRES_PORT,
                    'user': POSTGRES_USER,
                    'password': POSTGRES_PASSWORD,
                    'database': POSTGRES_DB,
                }
            }
        },
        'apps': {
            'models': {
                'models': ['dto.models', 'aerich.models'],
                'default_connection': 'default',
            }
        }
    }


TORTOISE_ORM = _get_db_config()
