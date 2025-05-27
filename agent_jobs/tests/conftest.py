import pytest

from typing import Any
from uuid import uuid4

from src.config import Config
from src.common.crypto import CryptoService
from src.common.s3_client import S3Client
from src.common.redis_client import RedisClient
from src.common.env import get_int, get_string
from src.agents.auth.has_required_secrets import LoginMethod

from .mocks import mock_webhook_client


def pytest_configure(config):
    config.option.asyncio_default_fixture_loop_scope = "session"


def pytest_addoption(parser):
    parser.addoption(
        "--repeat", action="store", help="Number of times to repeat each test"
    )


def pytest_generate_tests(metafunc):
    if metafunc.config.option.repeat is not None:
        count = int(metafunc.config.option.repeat)

        # We're going to duplicate these tests by parametrizing them,
        # which requires that each test has a fixture to accept the parameter.
        # We can add a new fixture like so:
        metafunc.fixturenames.append("tmp_ct")

        # Now we parametrize. This is what happens when we do e.g.,
        # @pytest.mark.parametrize('tmp_ct', range(count))
        # def test_foo(): pass
        metafunc.parametrize("tmp_ct", range(count))


@pytest.fixture
def task_id() -> str:
    """Generate a unique task ID for each test."""
    return str(uuid4())


@pytest.fixture
def config() -> Config:
    """Create a test configuration object."""
    return Config(
        headless=True,
        openai_api_key=get_string("OPENAI_API_KEY"),
        twocaptcha_api_key=get_string("TWOCAPTCHA_API_KEY", ""),
        crypto=CryptoService("LcfRw7-UwHF3a8A-Wpy3GVYTvseJuer6EBs6SGQNnZ0="),
        webhook_client=mock_webhook_client(),
        # Create a S3 client to the prod bucket or fallback to the local S3 if not available.
        s3_client=prod_bucket()
        or S3Client(
            access_key_id=get_string("S3_ACCESS_KEY_ID"),
            secret_access_key=get_string("S3_SECRET_ACCESS_KEY"),
            region="us-east-1",
            bucket_endpoint_url=get_string("S3_ENDPOINT_URL"),
            bucket_name=f"test-bucket-{uuid4()}",
        ),
        redis=RedisClient(
            host=get_string("REDIS_HOST"),
            port=get_int("REDIS_PORT"),
            db=0,
            password=None,
        ),
    )


@pytest.fixture
def prod_bucket() -> S3Client | None:
    """Fixture to create a s3 client connected to the prod bucket."""
    if not get_string("PROD_S3_ACCESS_KEY_ID", required=False):
        return None

    return S3Client(
        access_key_id=get_string("PROD_S3_ACCESS_KEY_ID"),
        secret_access_key=get_string("PROD_S3_SECRET_ACCESS_KEY"),
        region="us-east-1",
        bucket_endpoint_url=get_string("PROD_S3_ENDPOINT_URL"),
        bucket_name=get_string("PROD_S3_BUCKET_NAME"),
    )


@pytest.fixture
def playground_url() -> str:
    """Get the playground URL."""
    return get_string("PLAYGROUND_URL")


@pytest.fixture
def valid_username_password_credentials() -> list[dict[str, Any]]:
    """Fixture for valid username/password credentials."""
    return [
        {
            "category": LoginMethod.EMAIL.value,
            "name": "Credentials",
            "values": {"username": "testuser", "password": "password123"},
        }
    ]


@pytest.fixture
def valid_google_credentials() -> list[dict[str, Any]]:
    """Fixture for valid Google OAuth credentials."""
    return [
        {
            "category": LoginMethod.GOOGLE_OAUTH.value,
            "name": "Credentials",
            "values": {
                "username": "testuser@gmail.com",
                "password": "password123",
                "recovery_phone_number": "+11234567890",
            },
        }
    ]


@pytest.fixture
def invalid_username_password_credentials() -> list[dict[str, Any]]:
    """Fixture for invalid username/password credentials."""
    return [
        {
            "category": LoginMethod.EMAIL.value,
            "name": "marina",
            "values": {"username": "marina", "password": "marinapassword"},
        }
    ]


@pytest.fixture
def invalid_google_credentials() -> list[dict[str, Any]]:
    """Fixture for invalid Google OAuth credentials."""
    return [
        {
            "category": LoginMethod.GOOGLE_OAUTH.value,
            "name": "this-is-not-a-valid-email@fake-domain.com",
            "values": {
                "username": "this-is-not-a-valid-email@fake-domain.com",
                "password": "this-is-not-a-valid-password",
                "recovery_phone_number": "+11234567890",
            },
        }
    ]
