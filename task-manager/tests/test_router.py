import pytest

from typing import Callable
from src.test_run.agent_selection import select_agent_to_use, general_agent, login_agent, signup_agent
from src.utils.dto import Test, TestCategory


TESTS_GENERAL_AGENT: list[Test] = [
]

TESTS_SIGNUP_AGENT: list[Test] = [
    Test(
        category=TestCategory.SMOKE,
        name="Test Valid Data Input",
        url="https://tickpick_dev:tickpick.1@dev.tickpick.com/",
        description="Verify that valid data can be entered into the sign-up form fields.",
        steps="1. Click on the login button\n2. Click on the sign up button\n3. Generate a new email using \"plus addressing\" (i.e my@email.com -> my+uuid@email.com)\n4. Enter valid data into the rest of the sign-up form.\n5. Validate the data\n6. Click on the sign up button",
        assertions="1. Each field accepts valid data.\n2. No error messages are displayed.",
        feature_id="1234567890",
        preconditions="None",
    ),
    Test(
        category=TestCategory.SMOKE,
        name="Verify Sign-Up Form Presence",
        url="https://tickpick_dev:tickpick.1@dev.tickpick.com/",
        description="Ensure the sign-up form is present and visible on the page.",
        steps="1. Navigate to the sign-up page.\n2. Check for the presence of the sign-up form.\n3. Verify that all required fields are visible.",
        assertions="1. The sign-up form is present.\n2. All required fields are visible.",
        feature_id="1234567890",
        preconditions="None",
    ),
    Test(
        category=TestCategory.SMOKE,
        name="Validate Confirmation Message",
        url="https://tickpick_dev:tickpick.1@dev.tickpick.com/",
        description="Check for a confirmation message or redirection after successful sign-up.",
        steps="1. Observe the page after form submission.\n2. Verify the presence of a confirmation message or redirection.",
        assertions="1. A confirmation message is displayed.\n2. The user is redirected to the expected page.",
        feature_id="1234567890",
        preconditions="None",
    ),
    Test(
        category=TestCategory.SMOKE,
        name="Test Field Lengths",
        url="https://tickpick_dev:tickpick.1@dev.tickpick.com/",
        description="Validate the handling of maximum field lengths and special characters in the sign-up form.",
        steps="1. Click on the sign in button\n2. Click on the sign up button\n3. Enter data exceeding the maximum length into each field.\n4. Verify the form's response to these inputs.",
        assertions="Fields enforce maximum length restrictions.",
        feature_id="1234567890",
        preconditions="None",
    ),
]

TESTS_LOGIN_AGENT: list[Test] = [
    Test(
        category=TestCategory.SMOKE,
        name="Test Email and Password Login",
        url="https://tickpick_dev:tickpick.1@dev.tickpick.com/",
        description="Ensure users can log in using valid email and password credentials.",
        steps="1. Navigate to the login page.\n2. Enter a valid email in the Email field.\n3. Enter a valid password in the Password field.\n4. Click the \"Log In\" button.",
        assertions="- Verify the user is successfully logged in and redirected to the dashboard.",
        feature_id="1234567890",
        preconditions="None",
    ),
    Test(
        category=TestCategory.SMOKE,
        name="Verify Instant Log In Functionality",
        url="https://tickpick_dev:tickpick.1@dev.tickpick.com/",
        description="Ensure users can use the Instant Log In feature.",
        steps="1. Navigate to the login page.\n2. Click the \"Use Instant Log In Instead\" link.\n3. Complete the Instant Log In process.",
        assertions="- Verify the user is successfully logged in and redirected to the dashboard.",
        feature_id="1234567890",
        preconditions="None",
    ),
    Test(
        category=TestCategory.SMOKE,
        name="Verify Login with Apple",
        url="https://tickpick_dev:tickpick.1@dev.tickpick.com/",
        description="Ensure users can log in using their Apple account.",
        steps="1. Navigate to the login page.\n2. Click the \"Login with Apple\" button.\n3. Complete the Apple login process.",
        assertions="- Verify the user is successfully logged in and redirected to the dashboard.",
        feature_id="1234567890",
        preconditions="None",
    ),
    Test(
        category=TestCategory.SMOKE,
        name="Verify Login with Facebook",
        url="https://tickpick_dev:tickpick.1@dev.tickpick.com/",
        description="Ensure users can log in using their Facebook account.",
        steps="1. Navigate to the login page.\n2. Click the \"Login with Facebook\" button.\n3. Complete the Facebook login process.",
        assertions="- Verify the user is successfully logged in and redirected to the dashboard.",
        feature_id="1234567890",
        preconditions="None",
    ),
    Test(
        category=TestCategory.SMOKE,
        name="Verify Login with Google",
        url="https://tickpick_dev:tickpick.1@dev.tickpick.com/",
        description="Ensure users can log in using their Google account.",
        steps="1. Navigate to the login page.\n2. Click the \"Login with Google\" button.\n3. Complete the Google login process.",
        assertions="- Verify the user is successfully logged in and redirected to the dashboard.",
        feature_id="1234567890",
        preconditions="None",
    ),
    Test(
        category=TestCategory.SMOKE,
        name="Validate Email Field Input",
        url="https://tickpick_dev:tickpick.1@dev.tickpick.com/",
        description="Ensure the Email field validates user input correctly.",
        steps="1. Navigate to the login page.\n2. Leave the Email field empty and attempt to log in.\n3. Enter an invalid email format and attempt to log in.",
        assertions="- Verify an error message is displayed for empty Email field.\n- Verify an error message is displayed for invalid email format.",
        feature_id="1234567890",
        preconditions="None",
    ),
    Test(
        category=TestCategory.SMOKE,
        name="Validate Password Field Input",
        url="https://tickpick_dev:tickpick.1@dev.tickpick.com/",
        description="Ensure the Password field validates user input correctly.",
        steps="1. Navigate to the login page.\n2. Leave the Password field empty and attempt to log in.\n3. Enter a password that is too short and attempt to log in.",
        assertions="- Verify an error message is displayed for empty Password field.\n- Verify an error message is displayed for invalid password format.",
        feature_id="1234567890",
        preconditions="None",
    ),
]


TEST_CASES = [
    *[
        (test, general_agent) for test in TESTS_GENERAL_AGENT
    ],
    *[
        (test, signup_agent) for test in TESTS_SIGNUP_AGENT
    ],
    *[
        (test, login_agent) for test in TESTS_LOGIN_AGENT
    ],
]


@pytest.mark.asyncio
@pytest.mark.parametrize("test_input, expected_agent", TEST_CASES)
async def test_select_agent_to_use(test_input: Test, expected_agent: Callable) -> None:
    """
    Tests the select_agent_to_use function to ensure it selects the correct agent
    based on the provided test description.
    This test makes actual calls to the LLM.
    """

    selected_agent = await select_agent_to_use(test_input)

    assert selected_agent == expected_agent, f"For test '{test_input.name}', expected agent {expected_agent.__name__}, but got {selected_agent.__name__}"
