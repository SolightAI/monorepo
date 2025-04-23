import pytest

from src.agents._base_agent import check_final_test_result
from src.healthchecks import get_login_status

from src.utils.dto import Test, TestCategory
from src.utils.constants import TestStatus


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
