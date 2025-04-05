import os
import pytest
import logging

from uuid import uuid4
from fixtures.generate_auth_session import generate_auth_session


# Constants for test credentials
USERNAME_PASSWORD = "username_password"
OAUTH = "oauth_credential"

# Auth paths in the playground
EMAIL_PASSWORD_SIMPLE_PATH = "/auth/email_password/simple"
GOOGLE_SIMPLE_PATH = "/auth/google/simple"
EMAIL_PASSWORD_MESSY_PATH = "/auth/email_password/messy"
GOOGLE_MESSY_PATH = "/auth/google/messy"
STAGED_LOGIN_PATH = "/auth/staged/simple"


logger = logging.getLogger(__name__)


@pytest.fixture
def task_id():
    """Generate a unique task ID for each test."""
    return str(uuid4())


@pytest.fixture
def valid_username_password_credentials():
    """Fixture for valid username/password credentials."""
    return {
        USERNAME_PASSWORD: {
            "username": "testuser",
            "password": "password123"
        }
    }


@pytest.fixture
def valid_google_credentials():
    """Fixture for valid Google OAuth credentials."""
    return {
        OAUTH: {
            "provider": "Google",
            "username": "testuser@gmail.com",
            "password": "password123"
        }
    }


@pytest.fixture
def invalid_username_password_credentials():
    """Fixture for invalid username/password credentials."""
    return {
        USERNAME_PASSWORD: {
            "username": "marina",
            "password": "marinapassword"
        }
    }


@pytest.fixture
def invalid_google_credentials():
    """Fixture for invalid Google OAuth credentials."""
    return {
        OAUTH: {
            "provider": "Google",
            "username": "marina@gmail.com",
            "password": "marinapassword"
        }
    }


@pytest.mark.asyncio
async def test_generate_auth_session_simple_login(task_id, valid_username_password_credentials, playground_base_url):
    """Test authentication with valid username/password on the simple login page."""
    url = f"{playground_base_url}{EMAIL_PASSWORD_SIMPLE_PATH}"

    session = await generate_auth_session(
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
async def test_generate_auth_session_google_login(task_id, valid_google_credentials, playground_base_url):
    """Test authentication with valid Google OAuth credentials on the simple login page."""
    url = f"{playground_base_url}{GOOGLE_SIMPLE_PATH}"

    session = await generate_auth_session(
        task_id=task_id,
        url=url,
        secrets=valid_google_credentials,
        reuse_session=False
    )

    # Verify the session data structure
    assert "cookies" in session
    assert "localStorage" in session

    # Verify localStorage contains the expected auth data
    assert session["localStorage"].get("isLoggedIn") == "true"
    assert session["localStorage"].get("username") == "Test User"
    assert session["localStorage"].get("authProvider") == "google"


@pytest.mark.asyncio
async def test_generate_auth_session_messy_login(task_id, valid_username_password_credentials, playground_base_url):
    """Test authentication with valid username/password on the messy login page."""
    url = f"{playground_base_url}{EMAIL_PASSWORD_MESSY_PATH}"

    session = await generate_auth_session(
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


@pytest.mark.asyncio
async def test_generate_auth_session_staged_login(task_id, valid_username_password_credentials, playground_base_url):
    """Test authentication with valid username/password on the staged login page."""
    url = f"{playground_base_url}{STAGED_LOGIN_PATH}"

    session = await generate_auth_session(
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


@pytest.mark.asyncio
async def test_generate_auth_session_invalid_credentials(task_id, invalid_username_password_credentials, playground_base_url):
    """Test authentication with invalid username/password credentials."""
    url = f"{playground_base_url}{EMAIL_PASSWORD_SIMPLE_PATH}"

    with pytest.raises(Exception) as excinfo:
        await generate_auth_session(
            task_id=task_id,
            url=url,
            secrets=invalid_username_password_credentials,
            reuse_session=False
        )
    assert "[AN ERROR OCCURED]" in str(excinfo.value)


@pytest.mark.asyncio
async def test_generate_auth_session_invalid_google_credentials(task_id, invalid_google_credentials, playground_base_url):
    """Test authentication with invalid Google credentials."""
    url = f"{playground_base_url}{GOOGLE_SIMPLE_PATH}"

    with pytest.raises(Exception) as excinfo:
        session = await generate_auth_session(
            task_id=task_id,
            url=url,
            secrets=invalid_google_credentials,
            reuse_session=False
        )
        logger.error(f"[{task_id}] Returned session but should have raised an error: {session}")

    assert "[AN ERROR OCCURED]" in str(excinfo.value)


@pytest.mark.asyncio
async def test_session_reuse(task_id, valid_username_password_credentials, playground_base_url):
    """Test that sessions can be reused."""
    url = f"{playground_base_url}{EMAIL_PASSWORD_SIMPLE_PATH}"

    # Generate a session first
    session = await generate_auth_session(
        task_id=task_id,
        url=url,
        secrets=valid_username_password_credentials,
        reuse_session=False
    )

    # Now check if reuse_session=True returns the cached session
    reused_session = await generate_auth_session(
        task_id=task_id,
        url=url,
        secrets=valid_username_password_credentials,
        reuse_session=True
    )

    # The sessions should be the same (note: localStorage timestamps might differ slightly)
    assert session["cookies"] == reused_session["cookies"]
    assert "isLoggedIn" in reused_session["localStorage"]
    assert reused_session["localStorage"]["isLoggedIn"] == "true"


@pytest.mark.asyncio
async def test_generate_auth_session_farmzz(task_id):
    """Test authentication with valid username/password on the simple login page."""

    url = "https://farmzz.com/admin/profile"

    username = os.getenv("FARMZZ_USERNAME")
    if not username:
        raise ValueError("FARMZZ_USERNAME is not set")

    password = os.getenv("FARMZZ_PASSWORD")
    if not password:
        raise ValueError("FARMZZ_PASSWORD is not set")

    session = await generate_auth_session(
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

    # Verify the session data structure
    assert "cookies" in session
    assert "localStorage" in session

    # Verify localStorage contains the expected auth data
    assert "XSRF-TOKEN" in [cookie["name"] for cookie in session["cookies"]]
    assert [cookie for cookie in session["cookies"] if cookie["name"] == "XSRF-TOKEN"][0]["value"] is not None
    assert session["localStorage"].get("jwt") is not None


@pytest.mark.asyncio
async def test_generate_auth_session_tecla_academy(task_id):
    """Test authentication with valid username/password on the simple login page."""

    url = "https://teclaacademy.com/logins"

    username = os.getenv("TECLA_ACADEMY_USERNAME")
    if not username:
        raise ValueError("TECLA_ACADEMY_USERNAME is not set")

    password = os.getenv("TECLA_ACADEMY_PASSWORD")
    if not password:
        raise ValueError("TECLA_ACADEMY_PASSWORD is not set")

    session = await generate_auth_session(
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

    # Verify the session data structure
    assert "cookies" in session
    assert "localStorage" in session

    # Verify localStorage contains the expected auth data
    assert "AUTH_SESSION_ID" in [cookie["name"] for cookie in session["cookies"]]
    assert [cookie for cookie in session["cookies"] if cookie["name"] == "AUTH_SESSION_ID"][0]["value"] is not None
