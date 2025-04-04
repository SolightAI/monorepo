import sys
import pytest
import os
import asyncio
from urllib.request import urlopen
from urllib.error import URLError

# Environment variables
PLAYGROUND_URL = os.getenv("PLAYGROUND_URL", "http://localhost:3000")
HEADLESS = os.getenv("HEADLESS", "true").lower() == "true"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))


def pytest_addoption(parser):
    parser.addoption('--repeat', action='store', help='Number of times to repeat each test')


def pytest_generate_tests(metafunc):
    if metafunc.config.option.repeat is not None:
        count = int(metafunc.config.option.repeat)

        # We're going to duplicate these tests by parametrizing them,
        # which requires that each test has a fixture to accept the parameter.
        # We can add a new fixture like so:
        metafunc.fixturenames.append('tmp_ct')

        # Now we parametrize. This is what happens when we do e.g.,
        # @pytest.mark.parametrize('tmp_ct', range(count))
        # def test_foo(): pass
        metafunc.parametrize('tmp_ct', range(count))


def is_service_running(url):
    """Check if a service is running at the given URL."""
    try:
        urlopen(url)
        return True
    except URLError:
        return False


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
def ensure_playground_running():
    """
    Ensure the playground is running.

    If the playground is not already deployed/running, this will skip the tests
    that depend on it being available.
    """
    assert is_service_running(PLAYGROUND_URL), f"Playground not running at {PLAYGROUND_URL}. Tests skipped."

    # If we reach here, the playground is running
    return PLAYGROUND_URL


@pytest.fixture
def playground_base_url():
    """Return the base URL of the playground."""
    return PLAYGROUND_URL
