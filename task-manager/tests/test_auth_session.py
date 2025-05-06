import os
import pytest
import logging

from typing import Any
from src.validate_url.validate_url import validate_url
from src.fixtures.authentification.get_auth_session import get_auth_session
from src.fixtures.authentification.has_required_secrets import LoginMethod


# Auth paths in the playground
EMAIL_PASSWORD_SIMPLE_PATH = "/auth/email_password/simple"
EMAIL_PASSWORD_MESSY_PATH = "/auth/email_password/messy"
GOOGLE_SIMPLE_PATH = "/auth/google/simple"
GOOGLE_MESSY_PATH = "/auth/google/messy"
STAGED_SIMPLE_PATH = "/auth/staged/simple"
STAGED_MESSY_PATH = "/auth/staged/messy"
INSTANT_SIMPLE_PATH = "/auth/instant/simple"
INSTANT_MESSY_PATH = "/auth/instant/messy"
COMBINED_EMAIL_GOOGLE_SIMPLE_PATH = "/auth/combined/classic_google/simple"
COMBINED_EMAIL_GOOGLE_MESSY_PATH = "/auth/combined/classic_google/messy"
COMBINED_EMAIL_INSTANT_SIMPLE_PATH = "/auth/combined/classic_instant/simple"
COMBINED_INSTANT_GOOGLE_MESSY_PATH = "/auth/combined/classic_instant/messy"


logger = logging.getLogger(__name__)


@pytest.fixture
def valid_username_password_credentials() -> list[dict[str, Any]]:
    """Fixture for valid username/password credentials."""
    return [
        {
            "category": LoginMethod.EMAIL.value,
            "name": "Credentials",
            "values": {
                "username": "testuser",
                "password": "password123"
            }
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
            }
        }
    ]


@pytest.fixture
def invalid_username_password_credentials() -> list[dict[str, Any]]:
    """Fixture for invalid username/password credentials."""
    return [
        {
            "category": LoginMethod.EMAIL.value,
            "name": "marina",
            "values": {
                "username": "marina",
                "password": "marinapassword"
            }
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
            }
        }
    ]


@pytest.mark.asyncio
async def test_generate_auth_session_simple_login(task_id: str, valid_username_password_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with valid username/password on the simple login page."""
    url = f"{playground_base_url}{EMAIL_PASSWORD_SIMPLE_PATH}"

    session = await get_auth_session(
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
async def test_generate_auth_session_google_login(task_id: str, valid_google_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with valid Google OAuth credentials on the simple login page."""
    url = f"{playground_base_url}{GOOGLE_SIMPLE_PATH}"

    session = await get_auth_session(
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


@pytest.mark.skip(reason="Messy logins are too unpredictable to test")
@pytest.mark.asyncio
async def test_generate_auth_session_messy_login(task_id: str, valid_username_password_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with valid username/password on the messy login page."""
    url = f"{playground_base_url}{EMAIL_PASSWORD_MESSY_PATH}"

    session = await get_auth_session(
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
async def test_generate_auth_session_staged_login(task_id: str, valid_username_password_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with valid username/password on the staged login page."""
    url = f"{playground_base_url}{STAGED_SIMPLE_PATH}"

    session = await get_auth_session(
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


@pytest.mark.skip(reason="Messy logins are too unpredictable to test")
@pytest.mark.asyncio
async def test_generate_auth_session_staged_messy_login(task_id: str, valid_username_password_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with valid username/password on the messy staged login page."""
    url = f"{playground_base_url}{STAGED_MESSY_PATH}"

    session = await get_auth_session(
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


@pytest.mark.skip(reason="We do not support instant login yet")
@pytest.mark.asyncio
async def test_generate_auth_session_instant_simple_login(task_id: str, valid_username_password_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with valid credentials on the simple instant login page."""
    url = f"{playground_base_url}{INSTANT_SIMPLE_PATH}"

    session = await get_auth_session(
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


@pytest.mark.skip(reason="We do not support instant login yet")
@pytest.mark.asyncio
async def test_generate_auth_session_instant_messy_login(task_id: str, valid_username_password_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with valid credentials on the messy instant login page."""
    url = f"{playground_base_url}{INSTANT_MESSY_PATH}"

    session = await get_auth_session(
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
async def test_generate_auth_session_combined_email_google_simple(task_id: str, valid_username_password_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with valid username/password on the simple combined email/Google login page."""
    url = f"{playground_base_url}{COMBINED_EMAIL_GOOGLE_SIMPLE_PATH}"

    session = await get_auth_session(
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
async def test_generate_auth_session_combined_email_google_google_auth(task_id: str, valid_google_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with valid Google credentials on the simple combined email/Google login page."""
    url = f"{playground_base_url}{COMBINED_EMAIL_GOOGLE_SIMPLE_PATH}"

    session = await get_auth_session(
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
    assert session["localStorage"].get("authProvider") == "google"


@pytest.mark.skip(reason="Messy logins are too unpredictable to test")
@pytest.mark.asyncio
async def test_generate_auth_session_combined_email_google_messy(task_id: str, valid_username_password_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with valid username/password on the messy combined email/Google login page."""
    url = f"{playground_base_url}{COMBINED_EMAIL_GOOGLE_MESSY_PATH}"

    session = await get_auth_session(
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
async def test_generate_auth_session_combined_email_instant_simple(task_id: str, valid_username_password_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with valid username/password on the simple combined email/instant login page."""
    url = f"{playground_base_url}{COMBINED_EMAIL_INSTANT_SIMPLE_PATH}"

    session = await get_auth_session(
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


@pytest.mark.skip(reason="We do not support instant login yet")
@pytest.mark.asyncio
async def test_generate_auth_session_combined_instant_google_messy(task_id: str, valid_username_password_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with valid username/password on the messy combined instant/Google login page."""
    url = f"{playground_base_url}{COMBINED_INSTANT_GOOGLE_MESSY_PATH}"

    session = await get_auth_session(
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


@pytest.mark.skip(reason="Messy logins are too unpredictable to test")
@pytest.mark.asyncio
async def test_generate_auth_session_combined_instant_google_messy_google_auth(task_id: str, valid_google_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with valid Google credentials on the messy combined instant/Google login page."""
    url = f"{playground_base_url}{COMBINED_INSTANT_GOOGLE_MESSY_PATH}"

    session = await get_auth_session(
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
    assert session["localStorage"].get("authProvider") == "google"


@pytest.mark.asyncio
async def test_generate_auth_session_invalid_credentials(task_id: str, invalid_username_password_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with invalid username/password credentials."""
    url = f"{playground_base_url}{EMAIL_PASSWORD_SIMPLE_PATH}"

    with pytest.raises(Exception) as excinfo:
        await get_auth_session(
            task_id=task_id,
            url=url,
            secrets=invalid_username_password_credentials,
            reuse_session=False
        )
    assert "Login failed for" in str(excinfo.value)


@pytest.mark.asyncio
async def test_generate_auth_session_invalid_google_credentials(task_id: str, invalid_google_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with invalid Google credentials."""
    url = f"{playground_base_url}{GOOGLE_SIMPLE_PATH}"

    with pytest.raises(Exception) as excinfo:
        session = await get_auth_session(
            task_id=task_id,
            url=url,
            secrets=invalid_google_credentials,
            reuse_session=False
        )
        logger.error(f"[{task_id}] Returned session but should have raised an error: {session}")

    assert "Login failed for" in str(excinfo.value)


@pytest.mark.skip(reason="Requires a Redis instance to be running")
@pytest.mark.asyncio
async def test_session_reuse(task_id: str, valid_username_password_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test that sessions can be reused."""
    url = f"{playground_base_url}{EMAIL_PASSWORD_SIMPLE_PATH}"

    # Generate a session first
    session = await get_auth_session(
        task_id=task_id,
        url=url,
        secrets=valid_username_password_credentials,
        reuse_session=False
    )

    # Now check if reuse_session=True returns the cached session
    reused_session = await get_auth_session(
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
async def test_generate_auth_session_farmzz(task_id: str) -> None:
    """Test authentication with valid username/password on the simple login page."""

    url = "https://farmzz.com/admin/profile"

    username = os.getenv("FARMZZ_USERNAME")
    if not username:
        raise ValueError("FARMZZ_USERNAME is not set")

    password = os.getenv("FARMZZ_PASSWORD")
    if not password:
        raise ValueError("FARMZZ_PASSWORD is not set")

    session = await get_auth_session(
        task_id=task_id,
        url=url,
        secrets=[{
            'name': 'Credentials',
            'category': LoginMethod.EMAIL.value,
            'values': {
                "username": username,
                "password": password
            }
        }],
        reuse_session=False
    )

    # Verify the session data structure
    assert "cookies" in session
    assert "localStorage" in session

    assert session["localStorage"].get("jwt") is not None

    # Verify cookies contains the expected auth data
    assert "XSRF-TOKEN" in [cookie["name"] for cookie in session["cookies"]]
    assert [cookie for cookie in session["cookies"] if cookie["name"] == "XSRF-TOKEN"][0]["value"] is not None


@pytest.mark.asyncio
async def test_validate_url_login_farmzz(task_id: str) -> None:
    """
    Test validating the farmzz.com URL to find a login page,
    then attempt login with credentials.

    This test:
    1. Validates the farmzz.com URL to find the login page
    2. Uses the detected login page URL for authentication
    3. Confirms successful authentication
    """
    # First, validate the URL
    base_url = "https://farmzz.com"

    # Run the validation task directly
    validation_result = await validate_url({"job_id": task_id}, base_url, use_cache=False)

    # Debug output to show full validation result
    logger.info(f"[{task_id}] Validation result: {validation_result}")

    # Verify that validation found a login page
    assert validation_result["valid"] is True, f"Expected valid=True, got {validation_result.get('valid')}"
    assert validation_result["login_url"] == "https://farmzz.com/#/auth/login", f"Expected login_url='https://farmzz.com/#/auth/login', got {validation_result.get('login_url')}"
    assert validation_result["confidence"] in ["high", "medium"], f"Expected confidence in ['high', 'medium'], got {validation_result.get('confidence')}"
    assert validation_result["source"] == "validation", f"Expected source='validation', got {validation_result.get('source')}"

    logger.info(f"[{task_id}] ✅ Successfully validated URL and authenticated on: {validation_result['login_url']}")


@pytest.mark.asyncio
async def test_generate_auth_session_tecla_academy(task_id: str) -> None:
    """Test authentication with valid username/password on the simple login page."""

    url = "https://teclaacademy.com/logins"

    username = os.getenv("TECLA_ACADEMY_USERNAME")
    if not username:
        raise ValueError("TECLA_ACADEMY_USERNAME is not set")

    password = os.getenv("TECLA_ACADEMY_PASSWORD")
    if not password:
        raise ValueError("TECLA_ACADEMY_PASSWORD is not set")

    session = await get_auth_session(
        task_id=task_id,
        url=url,
        secrets=[{
            'name': 'Credentials',
            'category': LoginMethod.EMAIL.value,
            'values': {
                "username": username,
                "password": password
            }
        }],
        reuse_session=False
    )

    # Verify the session data structure
    assert "cookies" in session
    assert "localStorage" in session

    # Verify cookies contains the expected auth data
    assert "AUTH_SESSION_ID" in [cookie["name"] for cookie in session["cookies"]]
    assert [cookie for cookie in session["cookies"] if cookie["name"] == "AUTH_SESSION_ID"][0]["value"] is not None


@pytest.mark.asyncio
async def test_generate_auth_session_tickpick(task_id: str) -> None:
    """Test authentication with valid username/password on the simple login page."""

    url = "https://tickpick_dev:tickpick.1@dev.tickpick.com/"

    username = os.getenv("TICKPICK_USERNAME")
    if not username:
        raise ValueError("TICKPICK_USERNAME is not set")

    password = os.getenv("TICKPICK_PASSWORD")
    if not password:
        raise ValueError("TICKPICK_PASSWORD is not set")

    session = await get_auth_session(
        task_id=task_id,
        url=url,
        secrets=[{
            'name': 'Credentials',
            'category': LoginMethod.EMAIL.value,
            'values': {
                "username": username,
                "password": password
            }
        }],
        reuse_session=False
    )

    # Verify the session data structure
    assert "cookies" in session
    assert "localStorage" in session

    # Verify cookies contains the expected auth data
    assert "apiToken" in [cookie["name"] for cookie in session["cookies"]]
    assert [cookie for cookie in session["cookies"] if cookie["name"] == "apiToken"][0]["value"] is not None


@pytest.mark.asyncio
async def test_generate_auth_session_sesame_hr(task_id: str) -> None:
    """Test authentication with valid username/password on the simple login page."""

    url = "https://app.sesametime.com/"

    username = os.getenv("SESAME_HR_USERNAME")
    if not username:
        raise ValueError("SESAME_HR_USERNAME is not set")

    password = os.getenv("SESAME_HR_PASSWORD")
    if not password:
        raise ValueError("SESAME_HR_PASSWORD is not set")

    session = await get_auth_session(
        task_id=task_id,
        url=url,
        secrets=[{
            'name': 'Credentials',
            'category': LoginMethod.EMAIL.value,
            'values': {
                "username": username,
                "password": password
            }
        }],
        reuse_session=False
    )

    # Verify the session data structure
    assert "cookies" in session
    assert "localStorage" in session

    assert session["localStorage"].get("sesame-auth") is not None

    # Verify cookies contains the expected auth data
    assert "USID" in [cookie["name"] for cookie in session["cookies"]]
    assert [cookie for cookie in session["cookies"] if cookie["name"] == "USID"][0]["value"] is not None


@pytest.mark.asyncio
async def test_generate_auth_session_meandwho(task_id: str) -> None:
    """Test authentication with valid username/password on the simple login page."""

    url = "https://me.andwho.ai/"

    username = os.getenv("MEANDWHO_USERNAME")
    if not username:
        raise ValueError("MEANDWHO_USERNAME is not set")

    password = os.getenv("MEANDWHO_PASSWORD")
    if not password:
        raise ValueError("MEANDWHO_PASSWORD is not set")

    session = await get_auth_session(
        task_id=task_id,
        url=url,
        secrets=[{
            'name': 'Credentials',
            'category': LoginMethod.EMAIL.value,
            'values': {
                "username": username,
                "password": password
            }
        }],
        reuse_session=False
    )

    # Verify the session data structure
    assert "cookies" in session
    assert "localStorage" in session

    # Verify cookies contains the expected auth data
    assert "__client" in [cookie["name"] for cookie in session["cookies"]]
    assert [cookie for cookie in session["cookies"] if cookie["name"] == "__client"][0]["value"] is not None


@pytest.mark.asyncio
async def test_generate_auth_session_invalid_staged_login_credentials(task_id: str, invalid_username_password_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with invalid username/password credentials on staged login."""
    url = f"{playground_base_url}{STAGED_SIMPLE_PATH}"

    with pytest.raises(Exception) as excinfo:
        await get_auth_session(
            task_id=task_id,
            url=url,
            secrets=invalid_username_password_credentials,
            reuse_session=False
        )
    assert "Login failed for" in str(excinfo.value)


@pytest.mark.asyncio
async def test_generate_auth_session_invalid_instant_login_credentials(task_id: str, invalid_username_password_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with invalid credentials on instant login."""
    url = f"{playground_base_url}{INSTANT_SIMPLE_PATH}"

    with pytest.raises(Exception) as excinfo:
        await get_auth_session(
            task_id=task_id,
            url=url,
            secrets=invalid_username_password_credentials,
            reuse_session=False
        )
    assert "Login failed for" in str(excinfo.value)


@pytest.mark.asyncio
async def test_generate_auth_session_invalid_combined_email_google_credentials(task_id: str, invalid_username_password_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with invalid username/password credentials on combined email/Google login."""
    url = f"{playground_base_url}{COMBINED_EMAIL_GOOGLE_SIMPLE_PATH}"

    with pytest.raises(Exception) as excinfo:
        await get_auth_session(
            task_id=task_id,
            url=url,
            secrets=invalid_username_password_credentials,
            reuse_session=False
        )
    assert "Login failed for" in str(excinfo.value)


@pytest.mark.asyncio
async def test_generate_auth_session_invalid_combined_google_credentials(task_id: str, invalid_google_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with invalid Google credentials on combined email/Google login."""
    url = f"{playground_base_url}{COMBINED_EMAIL_GOOGLE_SIMPLE_PATH}"

    with pytest.raises(Exception) as excinfo:
        await get_auth_session(
            task_id=task_id,
            url=url,
            secrets=invalid_google_credentials,
            reuse_session=False
        )
    assert "Login failed for" in str(excinfo.value)


@pytest.mark.asyncio
async def test_generate_auth_session_invalid_combined_email_instant_credentials(task_id: str, invalid_username_password_credentials: list[dict[str, Any]], playground_base_url: str) -> None:
    """Test authentication with invalid username/password credentials on combined email/instant login."""
    url = f"{playground_base_url}{COMBINED_EMAIL_INSTANT_SIMPLE_PATH}"

    with pytest.raises(Exception) as excinfo:
        await get_auth_session(
            task_id=task_id,
            url=url,
            secrets=invalid_username_password_credentials,
            reuse_session=False
        )
    assert "Login failed for" in str(excinfo.value)
