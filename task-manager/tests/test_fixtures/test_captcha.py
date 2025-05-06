import pytest

from textwrap import dedent
from src.agents.login_agent import login_agent
from src.utils.dto import Test, TestCategory, TestStatus


@pytest.mark.asyncio
async def test_text_captcha_login_agent(task_id: str, repeat: int) -> None:
    """Test solving a text captcha."""

    test = Test(
        category=TestCategory.SMOKE,
        name="Solve captcha",
        url="https://captcha.com/demos/features/captcha-demo.aspx",
        description="Solve the captcha and verify that the text page displays 'Correct!'",
        steps=dedent("""
            1. Solve the captcha
        """),
        preconditions="None.",
        assertions=dedent("""
            1. The text page displays "Correct!" in green text
        """),
        feature_id=task_id,
    )

    result = await login_agent(
        task_id=task_id,
        test=test,
        secrets=[],
        auth_session={},
    )

    assert result["status"] == TestStatus.PASSED.value


@pytest.mark.asyncio
async def test_image_captcha_login_agent(task_id: str) -> None:
    """Test solving a image captcha."""

    test = Test(
        category=TestCategory.SMOKE,
        name="Solve captcha",
        url="https://www.google.com/recaptcha/api2/demo",
        description="Solve the captcha and verify that the text page displays 'Correct!'",
        steps=dedent("""
            1. Solve the captcha
        """),
        preconditions="None.",
        assertions=dedent("""
            1. The text page displays "Correct!" in green text
        """),
        feature_id=task_id,
    )

    result = await login_agent(
        task_id=task_id,
        test=test,
        secrets=[],
        auth_session={},
    )

    assert result["status"] == TestStatus.AGENT_LIMITATION.value
