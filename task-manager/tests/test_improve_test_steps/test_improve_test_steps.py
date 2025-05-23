import pytest

from textwrap import dedent
from src.agents.general_agent import general_agent
from src.utils.dto import Test, TestCategory, TestStatus
from src.improve_test_steps.endpoint import improve_test_steps


# NOTE: Currently to test if improve_test_steps, we test the agent on test steps that he previously couldn't execute and see if now we can execute them
# but another way is to test the agent on a test he previously could execute and see if it reduced the number of steps taken


@pytest.mark.skip(reason="This test is flaky, we need to fix it.")
class TestTickPick():

    @pytest.mark.asyncio
    async def test_checkout_detailed_steps(self, task_id: str) -> None:
        """Test authentication with valid email credentials."""

        url = "https://tickpick_dev:tickpick.1@dev.tickpick.com/checkout?listingId=856527893&quantity=1&listingType=TEVO&price=3&dt=f&dv=13&e=6576211&s=VR%20311&r=B"

        steps = dedent("""
        1. Wait until the entire checkout page is fully loaded and all interactive elements are visible.

        2. In the 'Payment Method' section at the top of the form:
            a. Locate all sets of credit card input fields on the page.
            b. Identify and use only the first visible set of credit card fields (inputs with names: 'credit-card-number', 'expiration-month', 'expiration-year', 'cvv').
            c. If a radio button or selector is present for payment method selection, ensure that 'New Credit Card' is selected.

        3. Enter invalid credit card details designed to trigger a velocity limit error in the first active set of credit card fields:
            a. In the 'Card Number' field (input[name='credit-card-number']), enter a value that triggers an exceeding velocity limit error.
            b. In the corresponding 'Expiration Month' field:
                - If a dropdown (select[name='expiration-month']) is present, select option "5" or "05".
                - If an input field (input[name='expiration-month']) is present instead, enter "05".
            c. In the corresponding 'Expiration Year' field:
                - If a dropdown (select[name='expiration-year']) is present, select option "2026".
                - If an input field (input[name='expiration-year']) is present instead, enter "2026".
            d. In the corresponding 'CVV/Security Code' field (input[name='cvv']), enter a valid CVV value such as "123".

        4. Fill out Buyer Information and Billing Information sections as required:
            a. Enter a valid email address using generate_random_email_address tool if needed.
            b. Enter valid values for First Name and Last Name fields in Billing Information section.
            c. Enter a valid street address in Address field in Billing Information section.
            d. Enter valid values for City, State/Province/Region, Zip/Postal Code, and Country fields if present.
            e. If a phone number field appears and is required, enter a valid US phone number (e.g., +555-123-4567).

        5. Review any additional checkboxes or options such as SMS opt-in; leave checked or unchecked according to default unless otherwise specified by requirements.

        6. Scroll down to the 'Make Your Tickets Reimbursable' section:
            a. Ensure that the radio button labelled "No, don't make my ticket reimbursable" (input[name='declineInsurance']) is selected.

        7. Scroll down to locate and review the main 'Place Order' button at the bottom of the form:
            a. Confirm that all required fields above are filled; if not, fill them as specified in previous steps.
            b. Click on the main 'Place Order' button (button[type='button'] with text 'Place Order').

        8. Wait for any processing animation or message to finish after clicking Place Order.

        Assertion/Validation:
            a. Verify that after processing completes, an error message appears stating exactly: "We encountered an error processing your order. Please try again."
            b. If this message does not appear but another error or alert is shown instead (such as an alert icon without text), note this as a deviation from expected behavior.
        """).strip()

        test_params = {
            "feature_id": task_id,
            "category": TestCategory.SMOKE,
            "name": "Invalid Credit Card: Exceeding Velocity Limit",
            "url": url,
            "description": "Verify that the user cannot use an invalid payment method.",
            "steps": steps,
            "preconditions": "None",
            "assertions": '* The following error must be displayed after trying to place the order : "We encountered an error processing your order. Please try again"',
        }

        new_test_steps = await improve_test_steps(
            {'job_id': task_id},
            product={"url": "dummy", "name": "dummy", "description": "dummy", "documentation": "dummy", "links_to_documentation": []},
            feature={},
            test=test_params,
            secrets=None,
        )

        assert new_test_steps["status"] == TestStatus.PASSED.value, f"Expected {TestStatus.PASSED.value} but got {new_test_steps['status']}"
        assert "assertion" not in new_test_steps["results"].lower(), f"Found assertion in the test steps: {new_test_steps['results']}"

        test_params["steps"] = new_test_steps["results"]

        result = await general_agent(
            identifier=None,
            task_id=task_id,
            test=Test(**test_params),
            secrets=[],
            auth_session={},
            run_without_cache=True,
        )

        assert result["status"] == TestStatus.PASSED.value, f"Expected {TestStatus.PASSED.value} but got {result['status']}: {result['results']}"

    @pytest.mark.asyncio
    async def test_checkout_slightly_detailed_steps(self, task_id: str) -> None:
        """Test authentication with valid email credentials."""

        url = "https://tickpick_dev:tickpick.1@dev.tickpick.com/checkout?listingId=856527893&quantity=1&listingType=TEVO&price=3&dt=f&dv=13&e=6576211&s=VR%20311&r=B"

        steps = dedent("""
        1. Wait until the entire checkout page is fully loaded and all interactive elements are visible.

        2. In the 'Payment Method' section at the top of the form enter a new credit card leading to an "Exceeding Velocity Limit" error

        3. Fill out Buyer Information and Billing Information sections as required:

        4. Ensure that the radio button labelled "No, don't make my ticket reimbursable" is selected.

        5. Press the 'Place Order' button at the bottom of the form.

        6. Wait for any processing animation or message to finish after clicking Place Order.
        """).strip()

        test_params = {
            "feature_id": task_id,
            "category": TestCategory.SMOKE,
            "name": "Invalid Credit Card: Exceeding Velocity Limit",
            "url": url,
            "description": "Verify that the user cannot use an invalid payment method.",
            "steps": steps,
            "preconditions": "None",
            "assertions": '* The following error must be displayed after trying to place the order : "We encountered an error processing your order. Please try again"',
        }

        new_test_steps = await improve_test_steps(
            {'job_id': task_id},
            product={"url": "dummy", "name": "dummy", "description": "dummy", "documentation": "dummy", "links_to_documentation": []},
            feature={},
            test=test_params,
            secrets=None,
        )

        assert new_test_steps["status"] == TestStatus.PASSED.value, f"Expected {TestStatus.PASSED.value} but got {new_test_steps['status']}"
        assert "assertion" not in new_test_steps["results"].lower(), f"Found assertion in the test steps: {new_test_steps['results']}"

        test_params["steps"] = new_test_steps["results"]

        result = await general_agent(
            identifier=None,
            task_id=task_id,
            test=Test(**test_params),
            secrets=[],
            auth_session={},
        )

        assert result["status"] == TestStatus.PASSED.value, f"Expected {TestStatus.PASSED.value} but got {result['status']}: {result['results']}"

    @pytest.mark.asyncio
    async def test_checkout_slightly_detailed_steps_missing_one_step(self, task_id: str) -> None:
        """Test authentication with valid email credentials."""

        url = "https://tickpick_dev:tickpick.1@dev.tickpick.com/checkout?listingId=856527893&quantity=1&listingType=TEVO&price=3&dt=f&dv=13&e=6576211&s=VR%20311&r=B"

        steps = dedent("""
        1. Wait until the entire checkout page is fully loaded and all interactive elements are visible.

        2. In the 'Payment Method' section at the top of the form enter a new credit card leading to an "Exceeding Velocity Limit" error

        3. Fill out Buyer Information and Billing Information sections as required:

        4. Ensure that the radio button labelled "No, don't make my ticket reimbursable" is selected.

        5. Wait for any processing animation or message to finish after clicking Place Order.
        """).strip()

        test_params = {
            "feature_id": task_id,
            "category": TestCategory.SMOKE,
            "name": "Invalid Credit Card: Exceeding Velocity Limit",
            "url": url,
            "description": "Verify that the user cannot use an invalid payment method.",
            "steps": steps,
            "preconditions": "None",
            "assertions": '* The following error must be displayed after trying to place the order : "We encountered an error processing your order. Please try again"',
        }

        new_test_steps = await improve_test_steps(
            {'job_id': task_id},
            product={"url": "dummy", "name": "dummy", "description": "dummy", "documentation": "dummy", "links_to_documentation": []},
            feature={},
            test=test_params,
            secrets=None,
        )

        assert new_test_steps["status"] == TestStatus.PASSED.value, f"Expected {TestStatus.PASSED.value} but got {new_test_steps['status']}"
        assert "assertion" not in new_test_steps["results"].lower(), f"Found assertion in the test steps: {new_test_steps['results']}"

        test_params["steps"] = new_test_steps["results"]

        result = await general_agent(
            identifier=None,
            task_id=task_id,
            test=Test(**test_params),
            secrets=[],
            auth_session={},
            run_without_cache=True,
        )

        assert result["status"] == TestStatus.PASSED.value, f"Expected {TestStatus.PASSED.value} but got {result['status']}: {result['results']}"

    @pytest.mark.asyncio
    async def test_checkout_broader_steps(self, task_id: str) -> None:
        """Test authentication with valid email credentials."""

        url = "https://tickpick_dev:tickpick.1@dev.tickpick.com/checkout?listingId=856527893&quantity=1&listingType=TEVO&price=3&dt=f&dv=13&e=6576211&s=VR%20311&r=B"

        steps = "Try the checkout flow using a credit card leading to an 'Exceeding Velocity Limit' error"

        test_params = {
            "feature_id": task_id,
            "category": TestCategory.SMOKE,
            "name": "Invalid Credit Card: Exceeding Velocity Limit",
            "url": url,
            "description": "Verify that the user cannot use an invalid payment method.",
            "steps": steps,
            "preconditions": "None",
            "assertions": '* The following error must be displayed after trying to place the order : "We encountered an error processing your order. Please try again"',
        }

        new_test_steps = await improve_test_steps(
            {'job_id': task_id},
            product={"url": "dummy", "name": "dummy", "description": "dummy", "documentation": "dummy", "links_to_documentation": []},
            feature={},
            test=test_params,
            secrets=None,
        )

        assert new_test_steps["status"] == TestStatus.PASSED.value, f"Expected {TestStatus.PASSED.value} but got {new_test_steps['status']}"
        assert "assertion" not in new_test_steps["results"].lower(), f"Found assertion in the test steps: {new_test_steps['results']}"

        test_params["steps"] = new_test_steps["results"]

        result = await general_agent(
            identifier=None,
            task_id=task_id,
            test=Test(**test_params),
            secrets=[],
            auth_session={},
            run_without_cache=True,
        )

        assert result["status"] == TestStatus.PASSED.value, f"Expected {TestStatus.PASSED.value} but got {result['status']}: {result['results']}"
