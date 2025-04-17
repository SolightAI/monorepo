import os
import redis
import logging

logger = logging.getLogger(__name__)


class RedisManager:
    _instance = None
    _client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RedisManager, cls).__new__(cls)
            cls._instance._initialize_client()
        return cls._instance

    def _initialize_client(self):

        try:
            redis_host = os.getenv("REDIS_HOST")
            redis_port = int(os.getenv("REDIS_PORT"))
            redis_db = int(os.getenv("REDIS_DB"))
            redis_password = os.getenv("REDIS_PASSWORD", None)
        except Exception as e:
            logger.error(f"Failed to initialize Redis client: {e}")
            self._client = None
            return

        if self._client is None:
            # Check if required environment variables are set
            if not redis_host or redis_port is None or redis_db is None:
                logger.error(
                    "Redis connection cannot be initialized. "
                    "Missing required environment variables: REDIS_HOST, REDIS_PORT, or REDIS_DB."
                )
                self._client = None
                return

            try:
                # decode_responses=True ensures keys/values are returned as strings
                self._client = redis.Redis(
                    host=redis_host,
                    port=redis_port,
                    db=redis_db,
                    password=redis_password,
                    decode_responses=True,
                    socket_connect_timeout=5  # Add timeout
                )
                # Test connection
                self._client.ping()
                logger.info(f"Successfully connected to Redis (Singleton) at {redis_host}:{redis_port} DB {redis_db}")
            except redis.exceptions.ConnectionError as e:
                logger.error(f"Failed to connect to Redis (Singleton) at {redis_host}:{redis_port}: {e}")
                self._client = None  # Ensure client is None if connection fails
            except Exception as e:
                logger.error(f"An unexpected error occurred during Redis (Singleton) initialization: {e}")
                self._client = None

    def get_client(self):
        """Returns the initialized Redis client instance."""
        # Ensure client is re-initialized if it failed previously (e.g., due to missing env vars at startup)
        if self._client is None and self._instance is not None:
            self._instance._initialize_client()
        return self._client


# Instantiate the singleton
redis_manager = RedisManager()
