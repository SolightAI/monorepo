import pytest

from textwrap import dedent
from src.agents._base_agent import check_final_test_result
from src.healthchecks import get_login_status
from src.utils.dto import Test, TestCategory, TestStatus


class TestTickPick():

    url = "https://tickpick_dev:tickpick.1@dev.tickpick.com/"

    test_params = {
        "category": TestCategory.SMOKE,
        "name": "Verify Sign Up with Email",
        "url": url,
        "description": "Test the ability of a user to sign up using the Email method.",
        "steps": "1. Locate and select the 'Sign Up with Email' option.\n2. Enter a valid email address in the 'Email' field.\n3. Re-enter the same email address in the 'Confirm Email' field.\n4. Enter a valid password (minimum 7 characters) in the 'Password' field.\n5. Submit the form.",
        "preconditions": "User is on the Sign Up page.",
        "assertions": "1. Verify that the user is successfully signed up",
    }

    @pytest.mark.asyncio
    async def test_agent_sure_healthcheck_positive(self, task_id: str) -> None:
        """Test authentication with valid email credentials."""

        agent_output = "The signup test for 'Verify Sign Up with Email' was successfully completed. The user was able to sign up using the email method, and the 'Successfully logged in' message confirms the success of the signup process."
        healthcheck_results = {
            get_login_status: True,
        }

        status, message = check_final_test_result(
            task_id=task_id,
            test=Test(**self.test_params, feature_id=task_id),
            agent_output=agent_output,
            healthcheck_results=healthcheck_results,
        )

        assert status.value == TestStatus.PASSED.value, f"Expected status {TestStatus.PASSED.value}, but got {status}: {message}"

    @pytest.mark.asyncio
    async def test_agent_running_wrong_test_healthcheck_negative(self, task_id: str) -> None:
        """Test authentication with valid email credentials."""

        agent_output = "The signup test was conducted successfully. The system correctly prevents users from signing up with an email already associated with an account, displaying a clear error message: 'Account already on file for email. Please log in.' Recommendations for improving user experience include adding a 'Forgot Password' option, support contact link, and account merging feature. The signup functionality for new users was not tested due to the existing account constraint. Further testing with a new email is recommended to fully verify the signup feature."
        healthcheck_results = {
            get_login_status: False,
        }

        status, message = check_final_test_result(
            task_id=task_id,
            test=Test(**self.test_params, feature_id=task_id),
            agent_output=agent_output,
            healthcheck_results=healthcheck_results,
        )

        # This is not a failure of the system but a limitation in the test execution due to the test data used.
        assert status.value == TestStatus.FAILED.value, f"Expected status {TestStatus.FAILED.value}, but got {status}: {message}"

    @pytest.mark.asyncio
    async def test_agent_fails_healthcheck_negative(self, task_id: str) -> None:
        """Test authentication with valid email credentials."""

        agent_output = "The signup test was conducted successfully. The system correctly prevents users from signing up with an email already associated with an account, displaying a clear error message: 'Account already on file for email. Please log in.' Recommendations for improving user experience include adding a 'Forgot Password' option, support contact link, and account merging feature. The signup functionality for new users was not tested due to the existing account constraint. Further testing with a new email is recommended to fully verify the signup feature."
        healthcheck_results = {
            get_login_status: False,
        }

        status, message = check_final_test_result(
            task_id=task_id,
            test=Test(**self.test_params, feature_id=task_id),
            agent_output=agent_output,
            healthcheck_results=healthcheck_results,
        )

        assert status.value == TestStatus.FAILED.value, f"Expected status {TestStatus.FAILED.value}, but got {status}: {message}"


class TestSolight():

    url = "https://app.solight.ai/"

    @pytest.mark.asyncio
    async def test_agent_positivz_healthcheck_negative(self, task_id: str) -> None:
        """Test authentication with valid Google OAuth credentials."""

        test_params = {
            "category": TestCategory.SMOKE,
            "name": "Verify Google Authentication Option",
            "url": self.url,
            "description": "Ensure that the 'Continue with Google' button is present and initiates the Google authentication flow when clicked.",
            "steps": dedent("""
                1. Locate the 'Continue with Google' button
                2. Click on the button
                3. Login using a real google account (creds provided at runtime)",
            """),
            "preconditions": "None.",
            "assertions": dedent("""
                1. The button labeled 'Continue with Google' is visible
                2. Clicking the button redirects or opens a new window/tab for Google authentication (e.g., accounts.google.com)
                3. The user is login using a real google
            """),
        }

        agent_output = dedent("""
            Test Case: Verify Google Authentication Option

            Results:
            1. The 'Continue with Google' button was visible on the Solight login page (Assertion 1: PASSED).
            2. Clicking the button redirected to the Google authentication flow at accounts.google.com (Assertion 2: PASSED).
            3. Login using real Google credentials was successful; after entering username and password (and handling CAPTCHA), the flow reached the consent screen and then redirected back to Solight (Assertion 3: PASSED).

            No error messages were encountered during login, except for a temporary CAPTCHA challenge which was resolved by retrying password entry.

            Conclusion: All test steps and assertions for verifying the Google Authentication option have been successfully completed.
        """)

        healthcheck_results = {
            get_login_status: False,
        }

        status, message = check_final_test_result(
            task_id=task_id,
            test=Test(**test_params, feature_id=task_id),
            agent_output=agent_output,
            healthcheck_results=healthcheck_results,
        )

        assert status.value == TestStatus.FAILED.value, f"Expected status {TestStatus.FAILED.value}, but got {status}: {message}"
