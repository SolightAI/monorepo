import logging

from typing import Any
from tempfile import NamedTemporaryFile
from browser_use import AgentHistoryList

from src.agents.get_agent import AgentParam, get_agent
from src.config import Config

from ..hooks import on_step_start_hook, on_step_end_hook


logger = logging.getLogger(__name__)


async def run_uncached_history(
    config: Config,
    task_id: str,
    identifier: str,
    agent_params: AgentParam,
    additional_task: str | None,
    **kwargs: Any,
) -> AgentHistoryList:
    logger.info(f"[{task_id}] Running agent for the first time")

    agent = get_agent(agent_params, **kwargs)
    agent._task_id = task_id  # type: ignore

    history = await agent.run(
        max_steps=50,
        on_step_start=on_step_start_hook(config.twocaptcha_api_key),
        on_step_end=on_step_end_hook(f"/tmp/{task_id}"),
    )

    if additional_task is not None and len(additional_task) > 0:
        injected_agent_state = agent.state

        agent = get_agent(
            agent_params,
            **kwargs
            | {
                "injected_agent_state": injected_agent_state,
                "task": additional_task,
            },
        )

        agent.add_new_task(additional_task)

        history = await agent.run(
            max_steps=50,
            on_step_start=on_step_start_hook(config.twocaptcha_api_key),
            on_step_end=on_step_end_hook(report_directory),
        )

        logger.info(f"[{task_id}] Agent finished running ({identifier})")

        with NamedTemporaryFile(
            mode="w+", suffix=".json", delete=False
        ) as history_file:
            logger.info(f"[{task_id}] Saving history to {f'{identifier}/history.json'}")

            history.save_to_file(history_file.name)

            config.s3_client.upload_file(
                file_path=history_file.name,
                object_name=f"{identifier}/history.json",
            )

    return history
