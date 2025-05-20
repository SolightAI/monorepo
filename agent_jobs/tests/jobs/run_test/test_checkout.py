import pytest

from textwrap import dedent

from src.config import Config
from src.agents.general_agent import general_agent
from src.common.dto import Test, TestCategory, TestStatus


TICK_PICK_URL = "https://tickpick_dev:tickpick.1@dev.tickpick.com/checkout?listingId=889809849&quantity=1&listingType=TEVO&price=28&dt=e&dv=2&e=7089570&s=109&r=4"


@pytest.mark.skip(
    reason="Our agent is not able to handle long tests with only high level steps (yet)"
)
class TestTickPickHighLevelSteps:
    async def _run_checkout_test(
        self,
        task_id: str,
        name: str,
        description: str,
        credit_card_step: str,
        assertions: str,
        expected_status: TestStatus,
        config: Config,
    ) -> None:
        """Helper method to run a checkout test case."""
        steps = dedent(
            f"""
            1. Fill a random email address.
            2. Select credit card as payment method
            {credit_card_step}
            3. Fill contact informations.Use a US phone number.
            4. Select "No, don't make my ticket reimbursable"
            5. Click "Place order"
        """.strip()
        )

        test = Test(
            category=TestCategory.NEGATIVE,
            name=name,
            url=TICK_PICK_URL,
            description=description,
            steps=steps,
            preconditions="None.",
            assertions=assertions,
            feature_id=task_id,
        )

        result = await general_agent(
            config=config,
            identifier=None,  # type: ignore
            task_id=task_id,
            test=test,
            secrets=[],
            auth_session={},
            run_without_cache=True,
        )

        assert (
            result["status"] == expected_status.value
        ), f"Expected {expected_status.value} but got {result['status']} ({task_id})"

    @pytest.mark.asyncio
    async def test_valid_credit_card(self, task_id: str, config: Config) -> None:
        """Test checkout with a valid credit card."""
        await self._run_checkout_test(
            config=config,
            task_id=task_id,
            name="Valid Credit Card",
            description="Verify that the user can use a credit card as valid payment method.",
            credit_card_step="3. Enter a valid credit card",
            assertions="* The payment must succeed by displaying 'Order Placed' message",
            expected_status=TestStatus.PASSED,
        )

    @pytest.mark.asyncio
    async def test_invalid_credit_card_incorrect_number(
        self, task_id: str, config: Config
    ) -> None:
        """Test checkout with an invalid credit card."""
        await self._run_checkout_test(
            config=config,
            task_id=task_id,
            name="Invalid Credit Card: Incorrect Number",
            description="Verify that the user cannot use an invalid payment method.",
            credit_card_step="3. Enter a credit card that has an incorrect number",
            assertions='* The following error must be displayed after trying to place the order : "Order Not Processed. The credit card number you entered is invalid."',
            expected_status=TestStatus.PASSED,
        )

    @pytest.mark.asyncio
    async def test_invalid_credit_card_exceeding_velocity_limit(
        self, task_id: str, config: Config
    ) -> None:
        """Test checkout with an invalid credit card that will exceed its velocity limit."""
        await self._run_checkout_test(
            config=config,
            task_id=task_id,
            name="Invalid Credit Card: Exceeding Velocity Limit",
            description="Verify that the user cannot use an invalid payment method.",
            credit_card_step="3. Enter a credit card that will exceed its velocity limit",
            assertions='* The following error must be displayed after trying to place the order : "We encountered an error processing your order. Please try again."',
            expected_status=TestStatus.PASSED,
        )

    @pytest.mark.asyncio
    async def test_invalid_credit_card_insufficient_funds(
        self, task_id: str, config: Config
    ) -> None:
        """Test checkout with an invalid credit card that has insufficient funds."""
        await self._run_checkout_test(
            config=config,
            task_id=task_id,
            name="Invalid Credit Card: Insufficient funds",
            description="Verify that the user cannot use an invalid payment method.",
            credit_card_step="3. Enter a credit card with insufficient funds",
            assertions='* The following error must be displayed after trying to place the order : "We encountered an error processing your order. Please try again."',
            expected_status=TestStatus.PASSED,
        )

    @pytest.mark.asyncio
    async def test_invalid_credit_card_invalid_cvc(
        self, task_id: str, config: Config
    ) -> None:
        """Test checkout with an invalid credit card that has an invalid CVC."""
        await self._run_checkout_test(
            config=config,
            task_id=task_id,
            name="Invalid Credit Card: Invalid CVC",
            description="Verify that the user cannot use an invalid payment method.",
            credit_card_step="3. Enter a credit card that has an invalid CVC.",
            assertions='* The following error must be displayed after trying to place the order : "We encountered an error processing your order. Please try again."',
            expected_status=TestStatus.PASSED,
        )

    @pytest.mark.asyncio
    async def test_invalid_credit_card_lost_card(
        self, task_id: str, config: Config
    ) -> None:
        """Test checkout with an invalid credit card that has been reported to be lost."""
        await self._run_checkout_test(
            config=config,
            task_id=task_id,
            name="Invalid Credit Card: Lost Card",
            description="Verify that the user cannot use an invalid payment method.",
            credit_card_step="3. Enter a credit card that has been reported to be lost.",
            assertions='* The following error must be displayed after trying to place the order : "We encountered an error processing your order. Please try again."',
            expected_status=TestStatus.PASSED,
        )


class TestTickPickStandardSteps:
    async def _run_checkout_test(
        self,
        task_id: str,
        config: Config,
        name: str,
        description: str,
        credit_card_step: str,
        assertions: str,
        expected_status: TestStatus,
    ) -> None:
        """Helper method to run a checkout test case."""
        steps = dedent(
            f"""
            1. Wait for the page to load
            2. At the top of the page, fill a random email address as "Buyer Information".
            3. Select (new) credit card as payment method at the top of the page
            {credit_card_step}
            4. Scroll down and fill all the contact informations (first name, last name, address, city, state, zip code, country, phone number). For the phone number, enter a US one with the +1 country code.
            5. Scroll down and select "No, don't make my ticket reimbursable"
            6. Scroll down and click "Place order"
            7. Wait for the "Processing" to finish until you have a final message
        """.strip()
        )  # NOTE: if we don't provide the fields to fill for "contact informations", the agent will often skip the "city", "state" and "zip code" fields

        test = Test(
            category=TestCategory.NEGATIVE,
            name=name,
            url=TICK_PICK_URL,
            description=description,
            steps=steps,
            preconditions="None.",
            assertions=assertions,
            feature_id=task_id,
        )

        result = await general_agent(
            config=config,
            identifier=None,  # type: ignore
            task_id=task_id,
            test=test,
            secrets=[],
            auth_session={},
            run_without_cache=True,
        )

        assert (
            result["status"] == expected_status.value
        ), f"Expected {expected_status.value} but got {result['status']} ({task_id})"

    @pytest.mark.asyncio
    async def test_valid_credit_card(self, task_id: str, config: Config) -> None:
        """Test checkout with a valid credit card."""
        await self._run_checkout_test(
            config=config,
            task_id=task_id,
            name="Valid Credit Card",
            description="Verify that the user can use a credit card as valid payment method.",
            credit_card_step="4. Enter a valid credit card",
            assertions="* The payment must succeed by displaying 'Order Placed' message",
            expected_status=TestStatus.PASSED,
        )

    @pytest.mark.asyncio
    async def test_invalid_credit_card_incorrect_number(
        self, task_id: str, config: Config
    ) -> None:
        """Test checkout with an invalid credit card."""
        await self._run_checkout_test(
            config=config,
            task_id=task_id,
            name="Invalid Credit Card: Incorrect Number",
            description="Verify that the user cannot use an invalid payment method.",
            credit_card_step="4. Enter a credit card that has an incorrect number",
            assertions='* The following error must be displayed after trying to place the order : "Order Not Processed. The credit card number you entered is invalid."',
            expected_status=TestStatus.PASSED,
        )

    @pytest.mark.asyncio
    async def test_invalid_credit_card_exceeding_velocity_limit(
        self, task_id: str, config: Config
    ) -> None:
        """Test checkout with an invalid credit card that will exceed its velocity limit."""
        await self._run_checkout_test(
            config=config,
            task_id=task_id,
            name="Invalid Credit Card: Exceeding Velocity Limit",
            description="Verify that the user cannot use an invalid payment method.",
            credit_card_step="4. Enter a credit card that will exceed its velocity limit",
            assertions='* The following error must be displayed after trying to place the order : "We encountered an error processing your order. Please try again."',
            expected_status=TestStatus.PASSED,
        )

    @pytest.mark.asyncio
    async def test_invalid_credit_card_insufficient_funds(
        self, task_id: str, config: Config
    ) -> None:
        """Test checkout with an invalid credit card that has insufficient funds."""
        await self._run_checkout_test(
            config=config,
            task_id=task_id,
            name="Invalid Credit Card: Insufficient funds",
            description="Verify that the user cannot use an invalid payment method.",
            credit_card_step="4. Enter a credit card with insufficient funds",
            assertions='* The following error must be displayed after trying to place the order : "We encountered an error processing your order. Please try again."',
            expected_status=TestStatus.PASSED,
        )

    @pytest.mark.asyncio
    async def test_invalid_credit_card_invalid_cvc(
        self, task_id: str, config: Config
    ) -> None:
        """Test checkout with an invalid credit card that has an invalid CVC."""
        await self._run_checkout_test(
            config=config,
            task_id=task_id,
            name="Invalid Credit Card: Invalid CVC",
            description="Verify that the user cannot use an invalid payment method.",
            credit_card_step="4. Enter a credit card that has an invalid CVC.",
            assertions='* The following error must be displayed after trying to place the order : "We encountered an error processing your order. Please try again."',
            expected_status=TestStatus.PASSED,
        )

    @pytest.mark.asyncio
    async def test_invalid_credit_card_lost_card(
        self, task_id: str, config: Config
    ) -> None:
        """Test checkout with an invalid credit card that has been reported to be lost."""
        await self._run_checkout_test(
            config=config,
            task_id=task_id,
            name="Invalid Credit Card: Lost Card",
            description="Verify that the user cannot use an invalid payment method.",
            credit_card_step="4. Enter a credit card that has been reported to be lost.",
            assertions='* The following error must be displayed after trying to place the order : "We encountered an error processing your order. Please try again."',
            expected_status=TestStatus.PASSED,
        )


# NOTE: the email address step is put in 4th instead of 1st to evaluate the agent's ability to handle wrongly ordered steps
class TestTickPickDetailedSteps:
    async def _run_checkout_test(
        self,
        task_id: str,
        config: Config,
        name: str,
        description: str,
        credit_card_step: str,
        assertions: str,
        expected_status: TestStatus,
    ) -> None:
        """Helper method to run a checkout test case."""
        steps = dedent(
            f"""
            1. Wait until the entire checkout page is fully loaded and all interactive elements are visible.
            2. Select the 'New Credit Card' payment method if not already selected.
            3. In the first visible set of credit card fields:
                a. {credit_card_step}.
                b. Enter a value in the cardholder name field.
                c. Select '05' as expiration month from the expiration month dropdown.
                d. Select '2026' as expiration year from the expiration year dropdown.
                e. Enter a value in the CVV field.
            4. Enter a valid email address in the buyer information section using the generate_random_email_address tool.
            5. In the Billing Information section:
                a. Enter a value in the First Name field.
                b. Enter a value in the Last Name field.
                c. Enter a value in the Address field.
                d. Enter a value in the City field.
                e. Enter a value in the State field.
                f. Enter a value in the Zip Code field.
                g. Select 'United States' as Country from country dropdown.
                h. Select 'United States' as Phone Country from phone country dropdown.
                i. Enter a valid US phone number in +1 format in phone number field.
            6. Leave any additional checkboxes such as SMS opt-in checked or unchecked according to their default state unless otherwise specified by requirements.
            7. In the 'Make Your Tickets Reimbursable' section, select the radio button labelled "No, don't make my ticket reimbursable".
            8. Scroll down if necessary to locate and click on the main 'Place Order' button at the bottom of the form.
        """.strip()
        )

        test = Test(
            category=TestCategory.NEGATIVE,
            name=name,
            url=TICK_PICK_URL,
            description=description,
            steps=steps,
            preconditions="None.",
            assertions=assertions,
            feature_id=task_id,
        )

        result = await general_agent(
            config=config,
            identifier=None,  # type: ignore
            task_id=task_id,
            test=test,
            secrets=[],
            auth_session={},
            run_without_cache=True,
        )

        assert (
            result["status"] == expected_status.value
        ), f"Expected {expected_status.value} but got {result['status']} ({task_id})"

    @pytest.mark.asyncio
    async def test_valid_credit_card(self, task_id: str, config: Config) -> None:
        """Test checkout with a valid credit card."""
        await self._run_checkout_test(
            config=config,
            task_id=task_id,
            name="Valid Credit Card",
            description="Verify that the user can use a credit card as valid payment method.",
            credit_card_step="Generate a valid credit card number and enter it into the 'Card Number' input fields.",
            assertions="* The payment must succeed by displaying 'Order Placed' message",
            expected_status=TestStatus.PASSED,
        )

    @pytest.mark.asyncio
    async def test_invalid_credit_card_incorrect_number(
        self, task_id: str, config: Config
    ) -> None:
        """Test checkout with an invalid credit card."""
        await self._run_checkout_test(
            config=config,
            task_id=task_id,
            name="Invalid Credit Card: Incorrect Number",
            description="Verify that the user cannot use an invalid payment method.",
            credit_card_step="Enter a credit card number designed to trigger an incorrect number error.",
            assertions='* The following error must be displayed after trying to place the order : "Order Not Processed. The credit card number you entered is invalid."',
            expected_status=TestStatus.PASSED,
        )

    @pytest.mark.asyncio
    async def test_invalid_credit_card_exceeding_velocity_limit(
        self, task_id: str, config: Config
    ) -> None:
        """Test checkout with an invalid credit card that will exceed its velocity limit."""
        await self._run_checkout_test(
            config=config,
            task_id=task_id,
            name="Invalid Credit Card: Exceeding Velocity Limit",
            description="Verify that the user cannot use an invalid payment method.",
            credit_card_step="Enter a credit card number designed to trigger an exceeding velocity limit error.",
            assertions='* The following error must be displayed after trying to place the order : "We encountered an error processing your order. Please try again."',
            expected_status=TestStatus.PASSED,
        )

    @pytest.mark.asyncio
    async def test_invalid_credit_card_insufficient_funds(
        self, task_id: str, config: Config
    ) -> None:
        """Test checkout with an invalid credit card that has insufficient funds."""
        await self._run_checkout_test(
            config=config,
            task_id=task_id,
            name="Invalid Credit Card: Insufficient funds",
            description="Verify that the user cannot use an invalid payment method.",
            credit_card_step="Enter a credit card number designed to trigger an insufficient funds error.",
            assertions='* The following error must be displayed after trying to place the order : "We encountered an error processing your order. Please try again."',
            expected_status=TestStatus.PASSED,
        )

    @pytest.mark.asyncio
    async def test_invalid_credit_card_invalid_cvc(
        self, task_id: str, config: Config
    ) -> None:
        """Test checkout with an invalid credit card that has an invalid CVC."""
        await self._run_checkout_test(
            config=config,
            task_id=task_id,
            name="Invalid Credit Card: Invalid CVC",
            description="Verify that the user cannot use an invalid payment method.",
            credit_card_step="Enter a credit card number designed to trigger an invalid CVC error.",
            assertions='* The following error must be displayed after trying to place the order : "We encountered an error processing your order. Please try again."',
            expected_status=TestStatus.PASSED,
        )

    @pytest.mark.asyncio
    async def test_invalid_credit_card_lost_card(
        self, task_id: str, config: Config
    ) -> None:
        """Test checkout with an invalid credit card that has been reported to be lost."""
        await self._run_checkout_test(
            config=config,
            task_id=task_id,
            name="Invalid Credit Card: Lost Card",
            description="Verify that the user cannot use an invalid payment method.",
            credit_card_step="Enter a credit card number designed to trigger a lost card error.",
            assertions='* The following error must be displayed after trying to place the order : "We encountered an error processing your order. Please try again."',
            expected_status=TestStatus.PASSED,
        )
