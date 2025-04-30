import pytest

from src.agents.general_agent import general_agent
from src.utils.dto import Test, TestCategory, TestStatus


class TestTickPick():

    url = "https://tickpick_dev:tickpick.1@dev.tickpick.com/checkout?listingId=856731695&quantity=1&listingType=TEVO&price=164&dt=f&dv=13&e=6574558&r=W&s=J"

    async def _run_checkout_test(
        self,
        task_id: str,
        name: str,
        description: str,
        credit_card_step: str,
        assertions: str,
        expected_status: TestStatus,
    ) -> None:
        """Helper method to run a checkout test case."""
        steps = f"""
1. Wait for the page to load
2. At the top of the page, fill a random email address as "Buyer Information".
3. Select (new) credit card as payment method at the top of the page
{credit_card_step}
5. Scroll down and make sure contact informations are filled. If they are not filled, fill them yourself. If you need to enter a phone number, enter an US one with the +1 country code.
6. Scroll down and make sure "No, don't make my ticket reimbursable" is selected
7. Scroll down and click "Place order"
8. Wait for the "Processing" to finish until you have a final message
        """.strip()

        test = Test(
            category=TestCategory.SMOKE,
            name=name,
            url=self.url,
            description=description,
            steps=steps,
            preconditions="None.",
            assertions=assertions,
            feature_id=task_id,
        )

        result = await general_agent(
            task_id=task_id,
            test=test,
            secrets=[],
            auth_session={},
        )

        assert result["status"] == expected_status.value, f"Expected {expected_status.value} but got {result['status']}"

    @pytest.mark.asyncio
    async def test_valid_credit_card(self, task_id: str) -> None:
        """Test checkout with a valid credit card."""
        await self._run_checkout_test(
            task_id=task_id,
            name="Valid Credit Card",
            description="Verify that the user can use a credit card as valid payment method.",
            credit_card_step="4. Enter a valid credit card",
            assertions="* The payment must succeed by displaying 'Order Placed' message",
            expected_status=TestStatus.PASSED,
        )

    @pytest.mark.asyncio
    async def test_invalid_credit_card_incorrect_number(self, task_id: str) -> None:
        """Test checkout with an invalid credit card."""
        await self._run_checkout_test(
            task_id=task_id,
            name="Invalid Credit Card: Incorrect Number",
            description="Verify that the user cannot use an invalid payment method.",
            credit_card_step="4. Enter a credit card that has an incorrect number",
            assertions='* The following error must be displayed after trying to place the order : "Order Not Processed. The credit card number you entered is invalid."',
            expected_status=TestStatus.PASSED,
        )

    @pytest.mark.asyncio
    async def test_invalid_credit_card_exceeding_velocity_limit(self, task_id: str) -> None:
        """Test checkout with an invalid credit card that will exceed its velocity limit."""
        await self._run_checkout_test(
            task_id=task_id,
            name="Invalid Credit Card: Exceeding Velocity Limit",
            description="Verify that the user cannot use an invalid payment method.",
            credit_card_step="4. Enter a credit card that will exceed its velocity limit",
            assertions='* The following error must be displayed after trying to place the order : "We encountered an error processing your order. Please try again."',
            expected_status=TestStatus.PASSED,
        )

    @pytest.mark.asyncio
    async def test_invalid_credit_card_insufficient_funds(self, task_id: str) -> None:
        """Test checkout with an invalid credit card that has insufficient funds."""
        await self._run_checkout_test(
            task_id=task_id,
            name="Invalid Credit Card: Insufficient funds",
            description="Verify that the user cannot use an invalid payment method.",
            credit_card_step="4. Enter a credit card with insufficient funds",
            assertions='* The following error must be displayed after trying to place the order : "We encountered an error processing your order. Please try again."',
            expected_status=TestStatus.PASSED,
        )

    @pytest.mark.asyncio
    async def test_invalid_credit_card_invalid_cvc(self, task_id: str) -> None:
        """Test checkout with an invalid credit card that has an invalid CVC."""
        await self._run_checkout_test(
            task_id=task_id,
            name="Invalid Credit Card: Invalid CVC",
            description="Verify that the user cannot use an invalid payment method.",
            credit_card_step="4. Enter a credit card that has an invalid CVC.",
            assertions='* The following error must be displayed after trying to place the order : "We encountered an error processing your order. Please try again."',
            expected_status=TestStatus.PASSED,
        )

    @pytest.mark.asyncio
    async def test_invalid_credit_card_lost_card(self, task_id: str) -> None:
        """Test checkout with an invalid credit card that has been reported to be lost."""
        await self._run_checkout_test(
            task_id=task_id,
            name="Invalid Credit Card: Lost Card",
            description="Verify that the user cannot use an invalid payment method.",
            credit_card_step="4. Enter a credit card that has been reported to be lost.",
            assertions='* The following error must be displayed after trying to place the order : "We encountered an error processing your order. Please try again."',
            expected_status=TestStatus.PASSED,
        )
