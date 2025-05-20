import os
import sys
import pytest
import warnings

from uuid import uuid4
from lmnr import Laminar

# Environment variables
PLAYGROUND_URL = os.getenv("PLAYGROUND_URL", "http://localhost:3000")
HEADLESS = os.getenv("HEADLESS", "true").lower() == "true"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))


if os.getenv("LMNR_PROJECT_API_KEY"):
    Laminar.initialize(project_api_key=os.getenv("LMNR_PROJECT_API_KEY"))
else:
    warnings.warn("LMNR_PROJECT_API_KEY is not set, deactivating tracing and observability")


def pytest_configure(config):
    config.option.asyncio_default_fixture_loop_scope = "session"


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


@pytest.fixture
def playground_base_url():
    """Return the base URL of the playground."""
    return PLAYGROUND_URL


@pytest.fixture
def task_id() -> str:
    """Generate a unique task ID for each test."""
    return str(uuid4())
