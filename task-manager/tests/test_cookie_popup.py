import pytest
import logging

from typing import Any
from test_auth_session import valid_username_password_credentials
from src.fixtures.authentification.get_auth_session import get_auth_session


# Auth paths in the playground
BANNER_EMAIL_PASSWORD_SIMPLE_PATH = "/privacy/banner/auth_email_password_simple"
MODAL_EMAIL_PASSWORD_SIMPLE_PATH = "/privacy/modal/auth_email_password_simple"


logger = logging.getLogger(__name__)


@pytest.mark.asyncio
async def test_privacy_banner_email_password_simple(task_id: str, valid_username_password_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with valid username/password on the simple login page."""
    url = f"{playground_base_url}{BANNER_EMAIL_PASSWORD_SIMPLE_PATH}"

    session = await get_auth_session(
        identifier=None,
        task_id=task_id,
        url=url,
        secrets=valid_username_password_credentials,
        reuse_session=False
    )

    # Verify the session data structure
    assert "cookies" in session
    assert "localStorage" in session

    # Verify localStorage contains the expected auth data
    assert session["localStorage"].get("isLoggedIn") == "true"
    assert session["localStorage"].get("username") == "testuser"


@pytest.mark.asyncio
async def test_privacy_modal_email_password_simple(task_id: str, valid_username_password_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with valid username/password on the simple login page."""
    url = f"{playground_base_url}{MODAL_EMAIL_PASSWORD_SIMPLE_PATH}"

    session = await get_auth_session(
        identifier=None,
        task_id=task_id,
        url=url,
        secrets=valid_username_password_credentials,
        reuse_session=False
    )

    # Verify the session data structure
    assert "cookies" in session
    assert "localStorage" in session

    # Verify localStorage contains the expected auth data
    assert session["localStorage"].get("isLoggedIn") == "true"
    assert session["localStorage"].get("username") == "testuser"
