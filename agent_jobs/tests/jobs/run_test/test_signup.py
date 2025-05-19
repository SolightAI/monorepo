import pytest

from src.config import Config
from src.agents.signup_agent import signup_agent
from src.common.dto import Test, TestCategory, TestStatus


class TestTickPick():

    url = "https://tickpick_dev:tickpick.1@dev.tickpick.com/"

    @pytest.mark.parametrize("repeat", range(5))
    @pytest.mark.asyncio
    async def test_verify_sign_up_with_email(self, task_id: str, repeat: int, config: Config) -> None:
        """Test authentication with valid email credentials."""

        test = Test(
            category=TestCategory.SMOKE,
            name="Verify Sign Up with Email",
            url=self.url,
            description="Test the ability of a user to sign up using the Email method.",
            steps="1. Locate and select the 'Sign Up with Email' option.\n2. Enter a valid email address in the 'Email' field.\n3. Re-enter the same email address in the 'Confirm Email' field.\n4. Enter a valid password (minimum 7 characters) in the 'Password' field.\n5. Submit the form.",
            preconditions="",
            assertions="The user is successfully signed up",
            feature_id=task_id,
        )

        result = await signup_agent(
            config=config,
            identifier=None,
            task_id=task_id,
            test=test,
            secrets=[],
            auth_session={},
        )

        assert result["status"] == TestStatus.PASSED.value

    @pytest.mark.asyncio
    async def test_verify_sign_up_with_apple(self, task_id: str, config: Config) -> None:
        """Test authentication with valid Apple credentials."""

        test = Test(
            category=TestCategory.SMOKE,
            name="Verify Sign Up with Apple",
            url=self.url,
            description="Test the ability of a user to sign up using the Apple method.",
            steps="1. Locate and select the 'Sign Up with Apple' option.\n2. Enter a valid email address in the 'Email' field.\n3. Re-enter the same email address in the 'Confirm Email' field.\n4. Enter a valid password (minimum 7 characters) in the 'Password' field.\n5. Agree to the 'User Agreement' and 'Privacy Policy' by checking the respective boxes.\n6. Submit the form.",
            preconditions="User is on the Sign Up page and has an active Apple account.",
            assertions="1. Verify that the user is successfully signed up and redirected to the appropriate page.\n2. Verify that a confirmation email is sent to the provided email address.",
            feature_id=task_id,
        )

        result = await signup_agent(
            config=config,
            identifier=None,
            task_id=task_id,
            test=test,
            secrets=[],
            auth_session={},
        )

        assert result["status"] == TestStatus.AGENT_LIMITATION.value

    @pytest.mark.asyncio
    async def test_verify_sign_up_with_google(self, task_id: str, config: Config) -> None:
        """Test authentication with valid Google OAuth credentials."""

        test = Test(
            category=TestCategory.SMOKE,
            name="Verify Sign Up with Google",
            url=self.url,
            description="Test the ability of a user to sign up using the Google method.",
            steps="1. Locate and select the 'Sign Up with Google' option.\n2. Enter a valid email address in the 'Email' field.\n3. Re-enter the same email address in the 'Confirm Email' field.\n4. Enter a valid password (minimum 7 characters) in the 'Password' field.\n5. Agree to the 'User Agreement' and 'Privacy Policy' by checking the respective boxes.\n6. Submit the form.",
            preconditions="User is on the Sign Up page and has an active Google account.",
            assertions="1. Verify that the user is successfully signed up and redirected to the appropriate page.\n2. Verify that a confirmation email is sent to the provided email address.",
            feature_id=task_id,
        )

        result = await signup_agent(
            config=config,
            identifier=None,
            task_id=task_id,
            test=test,
            secrets=[],
            auth_session={},
        )

        assert result["status"] == TestStatus.AGENT_LIMITATION.value
