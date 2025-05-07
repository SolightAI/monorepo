import pytest

from uuid import uuid4


def pytest_configure(config):
    config.option.asyncio_default_fixture_loop_scope = "session"


@pytest.fixture
def task_id() -> str:
    """Generate a unique task ID for each test."""
    return str(uuid4())
