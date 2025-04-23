import logging

from src.utils.dto import Test, TestCategory
from src.agents._base_agent import is_agent_able_to_run_test
from src.agents.signup_agent import AGENT_LIMITATIONS as SIGNUP_AGENT_LIMITATIONS
from src.agents.login_agent import AGENT_LIMITATIONS as LOGIN_AGENT_LIMITATIONS
from src.fixtures.tools import TOOLS


logger = logging.getLogger(__name__)


class TestTickPick():

    url = "https://tickpick_dev:tickpick.1@dev.tickpick.com/"

    def signup_wo_email_verification(self, task_id: str) -> None:

        test = Test(
            category=TestCategory.SMOKE,
            name="Verify Sign Up with Email",
            url=self.url,
            description="Test the ability of a user to sign up using the Email method.",
            steps="1. Locate and select the 'Sign Up with Email' option.\n2. Enter a valid email address in the 'Email' field.\n3. Re-enter the same email address in the 'Confirm Email' field.\n4. Enter a valid password (minimum 7 characters) in the 'Password' field.\n5. Submit the form.",
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

        assert is_able is True, f"Expected agent to be able to run the test, but it was not able to run the test: {explanation}"

    def signup_w_email_verification(self, task_id: str) -> None:

        test = Test(
            category=TestCategory.SMOKE,
            name="Verify Sign Up with Email",
            url=self.url,
            description="Test the ability of a user to sign up using the Email method.",
            steps="1. Locate and select the 'Sign Up with Email' option.\n2. Enter a valid email address in the 'Email' field.\n3. Re-enter the same email address in the 'Confirm Email' field.\n4. Enter a valid password (minimum 7 characters) in the 'Password' field.\n5. Submit the form.\n6. Verify the user has received an email verification link.",
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

        assert is_able is False, f"Expected agent to be able to run the test, but it was not able to run the test: {explanation}"

    def test_validate_email_field_input(self, task_id: str) -> None:

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

        is_able, explanation = is_agent_able_to_run_test(
            task_id=task_id,
            test=test,
            agent_tools=TOOLS,
            agent_limitations=LOGIN_AGENT_LIMITATIONS,
        )

        assert is_able is True, f"Expected agent to be able to run the test, but it was not able to run the test: {explanation}"
