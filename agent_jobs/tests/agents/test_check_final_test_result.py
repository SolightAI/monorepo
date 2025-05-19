import pytest
import base64

from textwrap import dedent
from tempfile import NamedTemporaryFile

from src.config import Config
from src.agents._check_final_test_result import check_final_test_result
from src.agents.healthchecks import get_login_status
from src.common.dto import Test, TestCategory, TestStatus


class TestTickPick:
    @pytest.mark.asyncio
    async def test_agent_sure_healthcheck_positive(self, task_id: str) -> None:
        """Test authentication with valid email credentials."""

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

        agent_output = "The signup test for 'Verify Sign Up with Email' was successfully completed. The user was able to sign up using the email method, and the 'Successfully logged in' message confirms the success of the signup process."
        healthcheck_results = {
            get_login_status: True,
        }

        status, message = await check_final_test_result(
            task_id=task_id,
            test=Test(**test_params, feature_id=task_id),
            agent_output=agent_output,
            healthcheck_results=healthcheck_results,
        )

        assert (
            status.value == TestStatus.PASSED.value
        ), f"Expected status {TestStatus.PASSED.value}, but got {status}: {message}"

    @pytest.mark.asyncio
    async def test_agent_running_wrong_test_healthcheck_negative(
        self, task_id: str
    ) -> None:
        """Test authentication with valid email credentials."""

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

        agent_output = "The signup test was conducted successfully. The system correctly prevents users from signing up with an email already associated with an account, displaying a clear error message: 'Account already on file for email. Please log in.' Recommendations for improving user experience include adding a 'Forgot Password' option, support contact link, and account merging feature. The signup functionality for new users was not tested due to the existing account constraint. Further testing with a new email is recommended to fully verify the signup feature."
        healthcheck_results = {
            get_login_status: False,
        }

        status, message = await check_final_test_result(
            task_id=task_id,
            test=Test(**test_params, feature_id=task_id),
            agent_output=agent_output,
            healthcheck_results=healthcheck_results,
        )

        # This is not a failure of the system but a limitation in the test execution due to the test data used.
        assert (
            status.value == TestStatus.FAILED.value
        ), f"Expected status {TestStatus.FAILED.value}, but got {status}: {message}"

    @pytest.mark.asyncio
    async def test_initiate_checkout_for_selected_tickets_negative(
        self,
        task_id: str,
        config: Config,
    ) -> None:
        url = "https://tickpick_dev:tickpick.1@dev.tickpick.com/checkout?listingId=889809938&quantity=1&listingType=TEVO&price=3&dt=e&dv=2&e=7089570&s=111&r=13"

        test_params = {
            "category": TestCategory.SMOKE,
            "name": "Select Two Tickets for Diana Krall Event",
            "url": url,
            "description": "Verify that a user can select two tickets from available listings for the Diana Krall event.",
            "steps": "1. Locate ticket listings section.\n2. Use quantity selector/input to choose 2 tickets.\n3. Select a ticket listing (if seat selection required).\n4.Click 'Buy' or equivalent button.",
            "preconditions": "User is on the Diana Krall event details page with ticket listings displayed.",
            "assertions": "1. Two tickets are selected and reflected in cart/order summary.\n2. Ticket price(s) are displayed with no hidden fees.",
        }

        with NamedTemporaryFile(suffix=".png") as temp_file:
            config.s3_client.download_file(
                object_name="tickpick_ticket_not_displayed.png",
                output_path=temp_file.name,
                overwrite_bucket="test-data",
            )

            with open(temp_file.name, "rb") as f:
                screenshot_base64 = base64.b64encode(f.read()).decode("utf-8")

            agent_output = "Test Failed: Attempted to select 2 tickets for six different Diana Krall events as required by the test case, but all attempts failed due to insufficient ticket quantity ('No seats match the quantity you've selected.'). As a result, it was not possible to proceed to checkout or verify order summary/payment options. Preconditions for this test are not met in the current environment/data. No further steps can be executed until at least one event has two or more tickets available for purchase."

            status, message = await check_final_test_result(
                task_id=task_id,
                test=Test(**test_params, feature_id=task_id),
                agent_output=agent_output,
                screenshot_base64=screenshot_base64,
            )

            assert (
                status.value == TestStatus.FAILED.value
            ), f"Expected status {TestStatus.FAILED.value}, but got {status}: {message}"

    @pytest.mark.asyncio
    async def test_preconditions_not_met_failed_to_start_test(
        self,
        task_id: str,
        config: Config,
    ) -> None:
        url = "https://tickpick_dev:tickpick.1@dev.tickpick.com"

        steps = dedent(
            """
        1. Enter valid payment information (credit card or Klarna).
        2. Agree to user agreement/privacy policy by checking required box.
        3. Click 'Place Order' or equivalent button.
        """.strip()
        )

        test_params = {
            "category": TestCategory.SMOKE,
            "name": "Complete Purchase with Payment and Agreement",
            "url": url,
            "description": "Verify that entering valid payment information and agreeing to terms allows successful completion of purchase for two Diana Krall tickets.",
            "steps": steps,
            "preconditions": "User is at checkout page with two selected tickets; payment form and agreement checkbox are visible.",
            "assertions": "1. Purchase completes successfully; confirmation message/page appears.\n2. Order confirmation includes correct details: 2 Diana Krall tickets, price breakdown with no hidden fees, order number/reference.",
        }

        agent_output = "Test Case: Complete Purchase with Payment and Agreement\n\nResult: NOT EXECUTED FULLY (Preconditions Not Met)\n\nFindings:\n- Navigated to the Diana Krall event ticket page on TickPick.\n- No tickets were available for selection; message displayed: 'No seats match the quantity you've selected.'\n- Only 'Any Quantity' was available in the quantity filter dropdown.\n- Attempted to interact with filters and event tracking, but no ticket options appeared.\n- Could not proceed to checkout, payment, or agreement steps as required by the test case.\n\nConclusion: The test could not be executed because no Diana Krall tickets were available for purchase. Preconditions (user at checkout with 2 selected tickets) were not met. Please retry when tickets become available."

        with NamedTemporaryFile(suffix=".png") as temp_file:
            config.s3_client.download_file(
                object_name="test_preconditions_not_met_failed_to_start_test.png",
                output_path=temp_file.name,
                overwrite_bucket="test-data",
            )

            with open(temp_file.name, "rb") as f:
                screenshot_base64 = base64.b64encode(f.read()).decode("utf-8")

            status, message = await check_final_test_result(
                task_id=task_id,
                test=Test(**test_params, feature_id=task_id),
                agent_output=agent_output,
                screenshot_base64=screenshot_base64,
            )

            assert (
                status.value == TestStatus.FAILED.value
            ), f"Expected status {TestStatus.FAILED.value}, but got {status}: {message}"

    @pytest.mark.asyncio
    async def test_valid_credit_card_succeed(
        self, task_id: str, config: Config
    ) -> None:
        url = "https://tickpick_dev:tickpick.1@dev.tickpick.com/checkout?listingId=889809938&quantity=1&listingType=TEVO&price=3&dt=e&dv=2&e=7089570&s=111&r=13"

        steps = dedent(
            """
        1. Wait until the checkout page is fully loaded and all form fields are visible.

        2. In the 'Buyer Information' section:
            a. Use the generate_random_email_address tool to generate a random email address.
            b. Enter the generated email address into the 'Email address' input field at the top of the form.

        3. In the 'Payment Method' section:
            a. Ensure that the 'New Credit Card' payment method is selected. If not already selected, select it.

        4. In the credit card details section:
            a. Use the generate_credit_card tool to generate valid credit card information (type: visa, error_type: none).
            b. Enter the generated card number into one of the 'Card Number' input fields (choose an empty/visible one).
            c. Enter a valid cardholder name into one of the 'Cardholder Name' input fields.
            d. Select or enter a valid expiration month using either an input or dropdown field for month.
            e. Select or enter a valid expiration year using either an input or dropdown field for year.
            f. Enter a valid CVV code into one of the 'CVV' input fields.

        5. In the billing/contact information section:
            a. Enter valid values into all required billing address fields: City ('City' input), State ('State' input), Zip Code ('Zip Code' input), Country (select 'United States' from country dropdown).
            b. For phone number:
                i. Select 'United States' from the phone country dropdown menu.
                ii. Enter a valid US phone number in international format starting with +1 in the phone number input field.

        6. In the reimbursable ticket option section:
            a. Ensure that 'No, don't make my ticket reimbursable' is selected by clicking its radio button if not already selected.

        7. Scroll down to locate and review all final terms and agreements if present.

        8. Click on the main checkout button labeled 'Place Order' to submit your order.

        9. Wait for any processing indicator or loading spinner to finish after submitting your order.
        """.strip()
        )

        test_params = {
            "category": TestCategory.SMOKE,
            "name": "Valid Credit Card",
            "url": url,
            "description": "Verify that the user can use a credit card as valid payment method.",
            "steps": steps,
            "preconditions": "None",
            "assertions": "* The payment must succeed",
        }

        agent_output = "Test Case: Valid Credit Card\n\nResult: PASS\n\n- The user was able to use a valid credit card as a payment method.\n- All form fields were filled as required (buyer info, credit card details, billing/contact info).\n- The correct options were selected for payment method and ticket reimbursement.\n- The final terms were reviewed before submission.\n- After clicking 'Place Order', the page displayed an 'Order Placed' confirmation with a check icon and instructions not to refresh or go back.\n- This confirms that payment succeeded and the order was placed as expected.\n\nAll steps of the test case were executed successfully. No errors or unexpected issues occurred that would prevent completion of the scenario."

        with NamedTemporaryFile(suffix=".png") as temp_file:
            config.s3_client.download_file(
                object_name="test_valid_credit_card_succeed.png",
                output_path=temp_file.name,
                overwrite_bucket="test-data",
            )

            with open(temp_file.name, "rb") as f:
                screenshot_base64 = base64.b64encode(f.read()).decode("utf-8")

            status, message = await check_final_test_result(
                task_id=task_id,
                test=Test(**test_params, feature_id=task_id),
                agent_output=agent_output,
                screenshot_base64=screenshot_base64,
            )

            assert (
                status.value == TestStatus.PASSED.value
            ), f"Expected status {TestStatus.PASSED.value}, but got {status}: {message}"

    @pytest.mark.asyncio
    async def test_valid_credit_card_succeed_but_agent_fails_bcs_of_result_msg(
        self,
        task_id: str,
        config: Config,
    ) -> None:
        url = "https://tickpick_dev:tickpick.1@dev.tickpick.com/checkout?listingId=889809938&quantity=1&listingType=TEVO&price=3&dt=e&dv=2&e=7089570&s=111&r=13"

        steps = dedent(
            """
        1. Wait until the checkout page is fully loaded and all form fields are visible.

        2. In the 'Buyer Information' section:
            a. Use the generate_random_email_address tool to generate a random email address.
            b. Enter the generated email address into the 'Email address' input field at the top of the form.

        3. In the 'Payment Method' section:
            a. Ensure that the 'New Credit Card' payment method is selected. If not already selected, select it.

        4. In the credit card details section:
            a. Use the generate_credit_card tool to generate valid credit card information (type: visa, error_type: none).
            b. Enter the generated card number into one of the 'Card Number' input fields (choose an empty/visible one).
            c. Enter a valid cardholder name into one of the 'Cardholder Name' input fields.
            d. Select or enter a valid expiration month using either an input or dropdown field for month.
            e. Select or enter a valid expiration year using either an input or dropdown field for year.
            f. Enter a valid CVV code into one of the 'CVV' input fields.

        5. In the billing/contact information section:
            a. Enter valid values into all required billing address fields: City ('City' input), State ('State' input), Zip Code ('Zip Code' input), Country (select 'United States' from country dropdown).
            b. For phone number:
                i. Select 'United States' from the phone country dropdown menu.
                ii. Enter a valid US phone number in international format starting with +1 in the phone number input field.

        6. In the reimbursable ticket option section:
            a. Ensure that 'No, don't make my ticket reimbursable' is selected by clicking its radio button if not already selected.

        7. Scroll down to locate and review all final terms and agreements if present.

        8. Click on the main checkout button labeled 'Place Order' to submit your order.

        9. Wait for any processing indicator or loading spinner to finish after submitting your order.
        """.strip()
        )

        test_params = {
            "category": TestCategory.SMOKE,
            "name": "Valid Credit Card",
            "url": url,
            "description": "Verify that the user can use a credit card as valid payment method.",
            "steps": steps,
            "preconditions": "None",
            "assertions": "* The payment must succeed",
        }

        agent_output = "Test Case: Valid Credit Card\n\nResult: FAILED\n\n- The user was able to use a valid credit card as a payment method.\n- All form fields were filled as required (buyer info, credit card details, billing/contact info).\n- The correct options were selected for payment method and ticket reimbursement.\n- The final terms were reviewed before submission.\n- After clicking 'Place Order', the page displayed a check icon and instructions not to refresh or go back.\n- This does not confirm that payment succeeded and the order was placed as expected."

        with NamedTemporaryFile(suffix=".png") as temp_file:
            config.s3_client.download_file(
                object_name="test_valid_credit_card_succeed.png",
                output_path=temp_file.name,
                overwrite_bucket="test-data",
            )

            with open(temp_file.name, "rb") as f:
                screenshot_base64 = base64.b64encode(f.read()).decode("utf-8")

            status, message = await check_final_test_result(
                task_id=task_id,
                test=Test(**test_params, feature_id=task_id),
                agent_output=agent_output,
                screenshot_base64=screenshot_base64,
            )

            assert (
                status.value == TestStatus.PASSED.value
            ), f"Expected status {TestStatus.PASSED.value}, but got {status}: {message}"


class TestSolight:
    url = "https://app.solight.ai/"

    @pytest.mark.asyncio
    async def test_agent_positive_healthcheck_negative(self, task_id: str) -> None:
        """Test agent thinking that he is logged in when he is not."""

        test_params = {
            "category": TestCategory.SMOKE,
            "name": "Verify Google Authentication Option",
            "url": self.url,
            "description": "Ensure that the 'Continue with Google' button is present and initiates the Google authentication flow when clicked.",
            "steps": dedent("""
                1. Locate the 'Continue with Google' button
                2. Click on the button
                3. Login using a real google account (creds provided at runtime),
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

        status, message = await check_final_test_result(
            task_id=task_id,
            test=Test(**test_params, feature_id=task_id),
            agent_output=agent_output,
            healthcheck_results=healthcheck_results,
        )

        assert (
            status.value == TestStatus.FAILED.value
        ), f"Expected status {TestStatus.FAILED.value}, but got {status}: {message}"
