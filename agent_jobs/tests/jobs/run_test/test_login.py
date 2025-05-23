import os
import pytest

from textwrap import dedent

from src.config import Config
from src.agents.login_agent import login_agent
from src.common.dto import Test, TestCategory, TestStatus
from src.agents.auth.has_required_secrets import LoginMethod


class TestTickPick:
    url = "https://tickpick_dev:tickpick.1@dev.tickpick.com/"

    @pytest.mark.asyncio
    async def test_validate_email_field_input(
        self, task_id: str, config: Config
    ) -> None:
        """Test validation of the Email field input."""

        test = Test(
            category=TestCategory.SMOKE,
            name="Validate Email Field Input",
            url=self.url,
            description="Ensure the Email field validates user input correctly.",
            steps="1. Navigate to the login page.\n2. Type a random password in the Password field.\n3. Leave the Email field empty and attempt to log in.",
            preconditions="None.",
            assertions="- Verify an error message is displayed for empty Email field.",
            feature_id=task_id,
        )

        result = await login_agent(
            config=config,
            identifier=None,  # type: ignore
            task_id=task_id,
            test=test,
            secrets=[],
            auth_session={},
            run_without_cache=True,
        )

        assert result.status.value == TestStatus.PASSED.value

    @pytest.mark.asyncio
    async def test_validate_password_field_input(
        self, task_id: str, config: Config
    ) -> None:
        """Test validation of the Password field input."""

        test = Test(
            category=TestCategory.SMOKE,
            name="Validate Password Field Input",
            url=self.url,
            description="Ensure the Password field validates user input correctly.",
            steps="1. Navigate to the login page.\n2. Enter a random email in the Email field.\n3. Leave the Password field empty and attempt to log in.",
            preconditions="None.",
            assertions="- Verify an error message is displayed for empty Password field.",
            feature_id=task_id,
        )

        result = await login_agent(
            config=config,
            identifier=None,  # type: ignore
            task_id=task_id,
            test=test,
            secrets=[],
            auth_session={},
            run_without_cache=True,
        )

        assert result.status.value == TestStatus.PASSED.value

    @pytest.mark.asyncio
    async def test_verify_email_and_password_login(
        self, task_id: str, config: Config
    ) -> None:
        """Test authentication with valid email and password credentials."""

        username = os.getenv("TICKPICK_USERNAME")
        if not username:
            raise ValueError("TICKPICK_USERNAME is not set")

        password = os.getenv("TICKPICK_PASSWORD")
        if not password:
            raise ValueError("TICKPICK_PASSWORD is not set")

        secrets = [
            {
                "name": "Credentials",
                "category": LoginMethod.EMAIL.value,
                "values": {"username": username, "password": password},
            }
        ]

        test = Test(
            category=TestCategory.SMOKE,
            name="Verify Email and Password Login",
            url=self.url,
            description="Ensure users can log in using valid email and password credentials.",
            steps='1. Navigate to the login page.\n2. Enter a valid email in the Email field.\n3. Enter a valid password in the Password field.\n4. Click the "Log In" button.',
            preconditions="User has a valid account with email and password.",
            assertions="- Verify the user is successfully logged in and redirected to the dashboard.",
            feature_id=task_id,
        )

        result = await login_agent(
            config=config,
            identifier=None,  # type: ignore
            task_id=task_id,
            test=test,
            secrets=secrets,
            auth_session={},
            run_without_cache=True,
        )

        assert result.status.value == TestStatus.PASSED.value

    @pytest.mark.asyncio
    async def test_apple_login(self, task_id: str, config: Config) -> None:
        """Test authentication with valid Apple credentials."""

        test = Test(
            category=TestCategory.SMOKE,
            name="Verify Sign Up with Apple",
            url=self.url,
            description="Ensure users can log in using valid Apple credentials.",
            steps='1. Navigate to the login page.\n2. Click the "Sign in with Apple" button.',
            preconditions="User has an active Apple account.",
            assertions="- Verify the user is successfully logged in and redirected to the dashboard.",
            feature_id=task_id,
        )

        result = await login_agent(
            config=config,
            identifier=None,  # type: ignore
            task_id=task_id,
            test=test,
            secrets=[],
            auth_session={},
            run_without_cache=True,
        )

        assert result.status.value == TestStatus.AGENT_LIMITATION.value

    @pytest.mark.asyncio
    async def test_google_login(self, task_id: str, config: Config) -> None:
        """Test authentication with valid Google OAuth credentials."""

        test = Test(
            category=TestCategory.SMOKE,
            name="Verify Google Login",
            url=self.url,
            description="Ensure users can log in using valid Google credentials.",
            steps='1. Click on the "Log In" button.\n2. Click the "Continue with Google" button.',
            preconditions="User has an active Google account.",
            assertions="- Verify the user is successfully logged in and redirected to the dashboard.",
            feature_id=task_id,
        )

        username = os.getenv(
            "SOLIGHT_USERNAME"
        )  # we use the same google account for all tests
        if not username:
            raise ValueError("SOLIGHT_USERNAME is not set")

        password = os.getenv("SOLIGHT_PASSWORD")
        if not password:
            raise ValueError("SOLIGHT_PASSWORD is not set")

        recovery_phone_number = os.getenv("SOLIGHT_RECOVERY_PHONE_NUMBER")
        if not recovery_phone_number:
            raise ValueError("SOLIGHT_RECOVERY_PHONE_NUMBER is not set")

        secrets = [
            {
                "name": "Google OAuth Credentials",
                "category": LoginMethod.GOOGLE_OAUTH.value,
                "values": {
                    "username": username,
                    "password": password,
                    "recovery_phone_number": recovery_phone_number,
                },
            }
        ]

        result = await login_agent(
            config=config,
            identifier=None,  # type: ignore
            task_id=task_id,
            test=test,
            secrets=secrets,
            auth_session={},
            run_without_cache=True,
        )

        assert result.status.value == TestStatus.PASSED.value


class TestSolight:
    url = "https://app.solight.ai/"

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "repeat", [i for i in range(5)]
    )  # reduce chances of flaky test
    async def test_login_with_google(
        self, task_id: str, repeat: int, config: Config
    ) -> None:
        """Test authentication with valid Google OAuth credentials."""

        username = os.getenv("SOLIGHT_USERNAME")
        if not username:
            raise ValueError("SOLIGHT_USERNAME is not set")

        password = os.getenv("SOLIGHT_PASSWORD")
        if not password:
            raise ValueError("SOLIGHT_PASSWORD is not set")

        recovery_phone_number = os.getenv("SOLIGHT_RECOVERY_PHONE_NUMBER")
        if not recovery_phone_number:
            raise ValueError("SOLIGHT_RECOVERY_PHONE_NUMBER is not set")

        secrets = [
            {
                "name": "Google OAuth Credentials",
                "category": LoginMethod.GOOGLE_OAUTH.value,
                "values": {
                    "username": username,
                    "password": password,
                    "recovery_phone_number": recovery_phone_number,
                },
            }
        ]

        test = Test(
            category=TestCategory.SMOKE,
            name="Verify Google Authentication Option",
            url=self.url,
            description="Ensure that the 'Continue with Google' button is present and initiates the Google authentication flow when clicked.",
            steps=dedent("""
                1. Locate the 'Continue with Google' button
                2. Click on the button
                3. Login using a real google account (creds provided at runtime),
            """),
            preconditions="None.",
            assertions=dedent("""
                1. The button labeled 'Continue with Google' is visible
                2. Clicking the button redirects or opens a new window/tab for Google authentication (e.g., accounts.google.com)
                3. The user is login using a real google
            """),
            feature_id=task_id,
        )

        result = await login_agent(
            config=config,
            identifier=None,  # type: ignore
            task_id=task_id,
            test=test,
            secrets=secrets,
            auth_session={},
            run_without_cache=True,
        )

        assert result.status.value == TestStatus.PASSED.value
