import os
import pytest
import logging
import json

from uuid import uuid4
from tempfile import NamedTemporaryFile
from generate_epics.generate_epics import _generate_epics
from fixtures.generate_auth_session import generate_auth_session, USERNAME_PASSWORD
from utils.dto import Product


# Path to our restricted page with invisible login banner
INVISIBLE_LOGIN_BANNER_PATH = "/epic/hidden-auth-banner"


logger = logging.getLogger(__name__)


@pytest.fixture
def task_id():
    """Generate a unique task ID for each test."""
    return str(uuid4())


@pytest.mark.asyncio
async def test_epic_generation_invisible_login_banner(task_id, playground_base_url):
    """Test epic generation on a page with invisible login banner."""
    url = f"{playground_base_url}{INVISIBLE_LOGIN_BANNER_PATH}"

    # Create a product for testing
    product = Product(
        url=url,
        name="Task Dashboard",
        description="A task management dashboard application with projects and tasks.",
        documentation="",
        links_to_documentation=[],
    )

    # Now generate epics using the authenticated session
    epics = await _generate_epics(
        task_id=task_id,
        product=product,
        localStorage={},
    )

    # Verify epics were generated
    assert epics is not None
    assert len(epics) > 0

    # Verify epics have expected structure
    for epic in epics:
        assert hasattr(epic, "name")
        assert hasattr(epic, "description")
        assert len(epic.name) > 0
        assert len(epic.description) > 0


@pytest.mark.asyncio
async def test_epic_generation_farmzz_product_page(task_id):
    """Test epic generation on a page with invisible login banner."""

    url = "https://farmzz.com/admin/farms/7363f941-dd1f-4716-abf0-d86cdb48b0f3/produces"

    # Create a product for testing
    product = Product(
        url=url,
        name="Farmzz",
        description="A task management dashboard application with projects and tasks.",
        documentation="",
        links_to_documentation=[],
    )

    username = os.getenv("FARMZZ_USERNAME")
    if not username:
        raise ValueError("FARMZZ_USERNAME is not set")

    password = os.getenv("FARMZZ_PASSWORD")
    if not password:
        raise ValueError("FARMZZ_PASSWORD is not set")

    auth_session = await generate_auth_session(
        task_id=task_id,
        url=url,
        secrets={
            USERNAME_PASSWORD: {
                "username": username,
                "password": password
            }
        },
        reuse_session=False
    )

    # Now generate epics using the authenticated session
    with NamedTemporaryFile(suffix=".json", mode="w+") as cookies_file:
        cookies_file.write(json.dumps(auth_session['cookies']))
        cookies_file.flush()
        cookies_file.seek(0)

        epics = await _generate_epics(
            task_id=task_id,
            product=product,
            cookies_file=cookies_file.name if auth_session.get('cookies') is not None else None,
            localStorage=auth_session.get('localStorage'),
            gif_output_path=None,
        )

    assert epics is not None
    assert len(epics) > 0

    # Verify epics have expected structure
    for epic in epics:
        assert hasattr(epic, "name")
        assert hasattr(epic, "description")
        assert len(epic.name) > 0
        assert len(epic.description) > 0
