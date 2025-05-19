import pytest

from textwrap import dedent

from src.config import Config
from src.agents.login_agent import login_agent
from src.common.dto import Test, TestCategory, TestStatus


@pytest.mark.skip(reason="Healthcheck blocks the tests (agent_limitations)")
@pytest.mark.asyncio
async def test_text_captcha_login_agent(task_id: str, config: Config) -> None:
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
        config=config,
        identifier=None,
        task_id=task_id,
        test=test,
        secrets=[],
        auth_session={},
        run_without_cache=True,
    )

    assert result["status"] == TestStatus.PASSED.value


@pytest.mark.asyncio
async def test_image_captcha_login_agent(task_id: str, config: Config) -> None:
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
        config=config,
        identifier=None, # TODO: CONTINUE REBASE FROM THERE https://github.com/SolightAI/monorepo/commit/23c7d01208e714a537b5987e9ed75d1c1cc5d53d#diff-95c1975f287d537c4af43bb4fd8ca810fd14d09bf6d51584a649eeb782b9e425
        task_id=task_id,
        test=test,
        secrets=[],
        auth_session={},
        run_without_cache=True,
    )

    assert result["status"] == TestStatus.AGENT_LIMITATION.value
