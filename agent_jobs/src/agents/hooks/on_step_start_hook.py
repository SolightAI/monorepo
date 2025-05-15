from logging import getLogger
from typing import Any, Callable, Coroutine
from browser_use import Agent
from hooks.captcha import check_for_captcha
from langchain_core.messages import HumanMessage


logger = getLogger(__name__)


def _update_step_counter(agent: Agent) -> None:
    if not hasattr(agent, "_current_step"):
        agent._current_step = 0 # type: ignore

    agent._current_step += 1 # type: ignore


async def check_for_google_mfa(agent: Agent) -> bool:
    page = await agent.browser_context.get_current_page()

    task_id = agent._task_id if hasattr(agent, "_task_id") else "?" # type: ignore

    await page.wait_for_load_state()

    try:

        try:
            page_content = await page.content()
        except:  # noqa: E722
            logger.warning(f"[{task_id}] page.content failed cause page was loading, retrying...")
            await page.wait_for_load_state("networkidle", timeout=3_500)
            page_content = await page.content()

    except Exception:
        logger.warning(f"[{task_id}] Couldn't load the page content, skipping mfa check")
        return False

    # if text "Verify it's you" in the page, inform the agent to fail the test
    if "Verify it's you" in page_content and 'Choose how you want to sign in' in page_content:
        content = (
            "You've encountered a MFA google verification.Select 'Confirm your recovery phone number' and enter the phone number provided in the secrets. "
            "If you do not have any phone number stored in secrets, stop all your actions and inform the user of the failure and that it's outside of your limitations."
        )

        logger.info(f"[{task_id}] Adding to agent's history: {content}")
        agent_message = HumanMessage(content=content)
        agent.message_manager._add_message_with_tokens(agent_message)

        return True

    return False


def on_step_start_hook(twocapha_api_key: str) -> Callable[[Agent], Coroutine[Any, Any, None]]:
  async def _on_step_start_hook(agent: Agent) -> None:

    _update_step_counter(agent)

    if await check_for_google_mfa(agent):
        return

    await check_for_captcha(agent)
    
  return _on_step_start_hook
