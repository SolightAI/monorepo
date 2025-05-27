import os
import json

from browser_use import Agent
from logging import getLogger
from typing import Any, Callable, Coroutine

logger = getLogger(__name__)


def _raise_if_fatal_report_exists(task_id: str, report_directory: str) -> None:

    if not os.path.exists(report_directory):
        return

    if len((_files := os.listdir(report_directory))) > 0:
        with open(os.path.join(report_directory, _files[0])) as f:
            report = json.load(f)
        error_message = f"{report.get('trigger')} - {report.get('event')}"
        logger.info(f"[{task_id}] - {error_message}")
        raise RuntimeError(error_message)


def on_step_end_hook(
    report_directory: str,
) -> Callable[[Agent], Coroutine[Any, Any, None]]:

    async def _on_step_end_hook(agent: Agent) -> None:
        _raise_if_fatal_report_exists(getattr(agent, "_task_id"), report_directory)

    return _on_step_end_hook
