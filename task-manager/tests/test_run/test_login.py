import pytest

from src.agents.login_agent import login_agent
from src.utils.dto import Test, TestCategory
from src.utils.constants import TestStatus


class TestTickPick():

    url = "https://tickpick_dev:tickpick.1@dev.tickpick.com/"

    @pytest.mark.asyncio
    async def test_validate_email_field_input(self, task_id: str) -> None:
        """Test validation of the Email field input."""

        test = Test(
            category=TestCategory.SMOKE,
            name="Validate Email Field Input",
            url=self.url,
            description="Ensure the Email field validates user input correctly.",
            steps="1. Navigate to the login page.\n2. Leave the Email field empty and attempt to log in.\n3. Enter an invalid email format and attempt to log in.",
            preconditions="None.",
            assertions="- Verify an error message is displayed for empty Email field.\n- Verify an error message is displayed for invalid email format.",
            feature_id=task_id,
        )

        result = await login_agent(
            task_id=task_id,
            test=test,
            secrets={},
            auth_session={},
        )

        assert result["status"] == TestStatus.PASSED

    @pytest.mark.asyncio
    async def test_validate_password_field_input(self, task_id: str) -> None:
        """Test validation of the Password field input."""

        test = Test(
            category=TestCategory.SMOKE,
            name="Validate Password Field Input",
            url=self.url,
            description="Ensure the Password field validates user input correctly.",
            steps="1. Navigate to the login page.\n2. Leave the Password field empty and attempt to log in.\n3. Enter a password shorter than 7 characters and attempt to log in.",
            preconditions="None.",
            assertions="- Verify an error message is displayed for empty Password field.\n- Verify an error message is displayed for password shorter than 7 characters.",
            feature_id=task_id,
        )

        result = await login_agent(
            task_id=task_id,
            test=test,
            secrets={},
            auth_session={},
        )

        assert result["status"] == TestStatus.PASSED

    @pytest.mark.asyncio
    async def test_verify_email_and_password_login(self, task_id: str) -> None:
        """Test authentication with valid email and password credentials."""

        test = Test(
            category=TestCategory.SMOKE,
            name="Verify Email and Password Login",
            url=self.url,
            description="Ensure users can log in using valid email and password credentials.",
            steps="1. Navigate to the login page.\n2. Enter a valid email in the Email field.\n3. Enter a valid password in the Password field.\n4. Click the \"Log In\" button.",
            preconditions="User has a valid account with email and password.",
            assertions="- Verify the user is successfully logged in and redirected to the dashboard.",
            feature_id=task_id,
        )

        result = await login_agent(
            task_id=task_id,
            test=test,
            secrets={},
            auth_session={},
        )

        assert result["status"] == TestStatus.PASSED

    @pytest.mark.asyncio
    async def test_verify_sign_up_with_apple(self, task_id: str) -> None:
        """Test authentication with valid Apple credentials."""

        test = Test(
            category=TestCategory.SMOKE,
            name="Verify Sign Up with Apple",
            url=self.url,
            description="Ensure users can log in using valid Apple credentials.",
            steps="1. Navigate to the login page.\n2. Click the \"Sign in with Apple\" button.",
            preconditions="User has an active Apple account.",
            assertions="- Verify the user is successfully logged in and redirected to the dashboard.",
            feature_id=task_id,
        )

        result = await login_agent(
            task_id=task_id,
            test=test,
            secrets={},
            auth_session={},
        )

        assert result["status"] == TestStatus.AGENT_LIMITATION

    @pytest.mark.asyncio
    async def test_verify_sign_up_with_google(self, task_id: str) -> None:
        """Test authentication with valid Google OAuth credentials."""

        test = Test(
            category=TestCategory.SMOKE,
            name="Verify Google Login",
            url=self.url,
            description="Ensure users can log in using valid Google credentials.",
            steps="1. Navigate to the login page.\n2. Click the \"Sign in with Google\" button.",
            preconditions="User has an active Google account.",
            assertions="- Verify the user is successfully logged in and redirected to the dashboard.",
            feature_id=task_id,
        )

        result = await login_agent(
            task_id=task_id,
            test=test,
            secrets={},
            auth_session={},
        )

        assert result["status"] == TestStatus.AGENT_LIMITATION
