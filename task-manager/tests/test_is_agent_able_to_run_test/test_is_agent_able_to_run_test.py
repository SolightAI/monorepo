import logging
import pytest

from textwrap import dedent
from src.utils.dto import Test, TestCategory
from src.agents._base_agent import is_agent_able_to_run_test
from src.agents.signup_agent import AGENT_LIMITATIONS as SIGNUP_AGENT_LIMITATIONS
from src.agents.login_agent import AGENT_LIMITATIONS as LOGIN_AGENT_LIMITATIONS
from src.fixtures.tools import TOOLS


logger = logging.getLogger(__name__)


ERROR_MESSAGE = "Expected {expected_result} but received {result}. Explanation: {explanation}"


class TestTickPick():

    url = "https://tickpick_dev:tickpick.1@dev.tickpick.com/"

    def signup_wo_email_verification(self, task_id: str) -> None:

        test = Test(
            category=TestCategory.SMOKE,
            name="Verify Sign Up with Email",
            url=self.url,
            description="Test the ability of a user to sign up using the Email method.",
            steps=dedent("""
                1. Locate and select the 'Sign Up with Email' option.
                2. Enter a valid email address in the 'Email' field.
                3. Re-enter the same email address in the 'Confirm Email' field.
                4. Enter a valid password (minimum 7 characters) in the 'Password' field.
                5. Submit the form.
            """),
            preconditions="User is on the Sign Up page.",
            assertions="1. Verify that the user is successfully signed up",
            feature_id=task_id,
        )

        is_able, explanation = is_agent_able_to_run_test(
            task_id=task_id,
            test=test,
            agent_tools=TOOLS,
            agent_limitations=SIGNUP_AGENT_LIMITATIONS,
        )

        assert is_able is True, ERROR_MESSAGE.format(expected_result=True, result=is_able, explanation=explanation)

    def signup_w_email_verification(self, task_id: str) -> None:

        test = Test(
            category=TestCategory.SMOKE,
            name="Verify Sign Up with Email",
            url=self.url,
            description="Test the ability of a user to sign up using the Email method.",
            steps=dedent("""
                1. Locate and select the 'Sign Up with Email' option.
                2. Enter a valid email address in the 'Email' field.
                3. Re-enter the same email address in the 'Confirm Email' field.
                4. Enter a valid password (minimum 7 characters) in the 'Password' field.
                5. Submit the form.
                6. Verify the user has received an email verification link.
            """),
            preconditions="User is on the Sign Up page.",
            assertions="1. Verify that the user is successfully signed up\n2. Verify the user has received an email verification link",
            feature_id=task_id,
        )

        is_able, explanation = is_agent_able_to_run_test(
            task_id=task_id,
            test=test,
            agent_tools=TOOLS,
            agent_limitations=SIGNUP_AGENT_LIMITATIONS,
        )

        assert is_able is False, ERROR_MESSAGE.format(expected_result=False, result=is_able, explanation=explanation)

    def test_validate_email_field_input(self, task_id: str) -> None:

        test = Test(
            category=TestCategory.SMOKE,
            name="Validate Email Field Input",
            url=self.url,
            description="Ensure the Email field validates user input correctly.",
            steps=dedent("""
                1. Navigate to the login page.
                2. Leave the Email field empty and attempt to log in.
                3. Enter an invalid email format and attempt to log in.
            """),
            preconditions="None.",
            assertions="- Verify an error message is displayed for empty Email field.\n- Verify an error message is displayed for invalid email format.",
            feature_id=task_id,
        )

        is_able, explanation = is_agent_able_to_run_test(
            task_id=task_id,
            test=test,
            agent_tools=TOOLS,
            agent_limitations=LOGIN_AGENT_LIMITATIONS,
        )

        assert is_able is True, ERROR_MESSAGE.format(expected_result=True, result=is_able, explanation=explanation)


class TestSolight():

    url = "https://app.solight.ai/"

    @pytest.mark.parametrize("repeat", [i for i in range(3)])  # reduce chances of flaky test
    def test_login_with_google(self, task_id: str, repeat: int) -> None:

        test = Test(
            category=TestCategory.SMOKE,
            name="Verify Google Authentication Option",
            url=self.url,
            description="Ensure that the 'Continue with Google' button is present and initiates the Google authentication flow when clicked.",
            steps=dedent("""
                1. Locate the 'Continue with Google' button
                2. Click on the button
                3. Login
            """),
            preconditions="None.",
            assertions=dedent("""
                1. The button labeled 'Continue with Google' is visible
                2. Clicking the button redirects or opens a new window/tab for Google authentication (e.g., accounts.google.com)
                3. The user is logged in
            """),
            feature_id=task_id,
        )

        is_able, explanation = is_agent_able_to_run_test(
            task_id=task_id,
            test=test,
            agent_tools=TOOLS,
            agent_limitations=LOGIN_AGENT_LIMITATIONS,
        )

        assert is_able is True, ERROR_MESSAGE.format(expected_result=True, result=is_able, explanation=explanation)

    @pytest.mark.parametrize("social_media", ["GitHub", "Facebook", "Twitter", "Microsoft"])
    def test_login_with_invalid_social_media(self, task_id: str, social_media: str) -> None:

        test = Test(
            category=TestCategory.SMOKE,
            name=f"Verify {social_media} Authentication Option",
            url=self.url,
            description=f"Test the ability of a user to login using the {social_media} method.",
            steps=dedent(f"""
                1. Locate and click on the 'Continue with {social_media}' button.
                2. Login
            """),
            preconditions="User is on the Solight login page (https://app.solight.ai/login).",
            assertions="1. Verify that the user is successfully logged in",
            feature_id=task_id,
        )

        is_able, explanation = is_agent_able_to_run_test(
            task_id=task_id,
            test=test,
            agent_tools=TOOLS,
            agent_limitations=LOGIN_AGENT_LIMITATIONS,
        )

        assert is_able is False, ERROR_MESSAGE.format(expected_result=False, result=is_able, explanation=explanation)
