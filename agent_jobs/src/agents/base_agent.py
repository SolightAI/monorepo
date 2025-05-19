import json
import logging
import os

from typing import Callable, Any

from PIL import Image
from langchain_openai import ChatOpenAI
from lmnr import observe
from tempfile import _TemporaryFileWrapper, NamedTemporaryFile, TemporaryDirectory
from browser_use import Browser, AgentHistoryList, Controller
from browser_use.browser.context import (
    BrowserContextConfig,
    BrowserContext,
    BrowserContextWindowSize,
)

from src.common.s3_client import S3Client
from src.config import Config

from .runner import run_uncached_history, try_rerun_from_history
from .utils import load_local_storage, get_local_storage, create_browser
from .tools import TOOLS


logger = logging.getLogger(__name__)


@observe()
async def run_agent(
    config: Config,
    task_id: str,
    url: str,
    prompt: str,
    identifier: str,
    run_without_cache: bool,
    sensitive_data: dict[str, str],
    auth_session: dict[str, dict[str, str]] | None = None,
    additional_task: str | None = None,
    tools: list[Callable] = TOOLS,
    headless: bool = True,
    **kwargs: Any,
) -> tuple[dict[str, dict[str, str]], AgentHistoryList, list[str], bool]:
    with NamedTemporaryFile(mode="w+", suffix=".json", delete=False) as cookies_file:
        if auth_session is None:
            json.dump([], cookies_file)
        else:
            if auth_session.get("cookies") is not None:
                json.dump(auth_session.get("cookies"), cookies_file)

        cookies_file.flush()

    browser = create_browser(
        headless,
        [
            "--disable-web-security",
            "--disable-site-isolation-trials",
            "--disable-features=IsolateOrigins,site-per-process",
        ],
    )

    context = _create_browser_context(browser, cookies_file)

    try:
        if auth_session and auth_session.get("localStorage") is not None:
            await context.navigate_to(url)
            await load_local_storage(context, auth_session["localStorage"])

        # Assign tools
        controller = Controller()
        for tool in tools or []:
            if not tool.__doc__:
                raise ValueError(f"Tool {tool.__name__} has no docstring")

            controller.action(tool.__doc__.strip() or "")(tool)

        logger.info(f"[{task_id}] Checking if history exists in S3 for {identifier}")

        agent_params = _create_agent_params(
            prompt,
            url,
            context,
            controller,
            sensitive_data,
            **kwargs,
        )

        ran_from_cache = False

        if not run_without_cache and config.s3_client.exists(f"{identifier}/history.json"):
            logger.info(f"[{task_id}] Try Running agent from cached history")

            history, ran_from_cache = await try_rerun_from_history(
                config=config,
                task_id=task_id,
                identifier=identifier,
                agent_params=agent_params,
            )

        if ran_from_cache is False:
            history = await run_uncached_history(
                config=config,
                task_id=task_id,
                identifier=identifier,
                agent_params=agent_params,
                additional_task=additional_task,
            )

        logger.info(f"[{task_id}] Agent finished running ({identifier=})")

        cookies = await context.session.context.cookies()  # type: ignore
        local_storage_data = await get_local_storage(context)

        logger.info(f"[{task_id}] Retrieved cookies and localStorage data")
    except Exception as e:
        raise e
    finally:
        await context.close()
        await browser.close()
        logger.info(f"[{task_id}] Closed browser context and browser")

        os.remove(cookies_file.name)

    session_data = {"cookies": cookies, "localStorage": local_storage_data}

    logger.info(f"[{task_id}] Generating evidences")

    evidences = await _generate_and_upload_evidences(
        task_id=task_id,
        history=history,  # type: ignore (TODO(TomChv): Is the value really unbound?)
        s3_client=config.s3_client,
    )

    logger.info(f"[{task_id}] Returning session data, history and evidences")

    return session_data, history, evidences, not ran_from_cache  # type: ignore (TODO(TomChv): Is the value really unbound?)


def _create_agent_params(
    prompt: str,
    url: str,
    browser_context: BrowserContext,
    controller: Controller,
    sensitive_data: dict[str, str] | None = None,
    **kwargs: Any,
) -> dict[str, Any]:
    agent_client = ChatOpenAI(
        model="gpt-4.1",
        temperature=0.0,
        timeout=120,
        frequency_penalty=0.3,
    )

    return {
        "task": prompt,
        "llm": kwargs.get("llm", agent_client),
        "use_vision": kwargs.get("use_vision", False),
        "enable_memory": kwargs.get("enable_memory", False),
        "initial_actions": [
            {"go_to_url": {"url": url}},
            {
                "go_to_url": {"url": url}
            },  # necessary to do it twice in some situations (i.e tickpick in-url auth in dev)
            {"wait": {"seconds": 5}},
        ],
        "sensitive_data": sensitive_data,
        "browser_context": browser_context,
        "controller": controller,
        "max_actions_per_step": 1,
    }


async def _generate_and_upload_evidences(
    task_id: str,
    history: AgentHistoryList,
    s3_client: S3Client,
) -> list[str]:
    evidences = []

    from browser_use.agent.gif import (
        create_history_gif,
    )  # import here to avoid thread blocking

    with TemporaryDirectory() as temp_dir:
        gif_path = os.path.join(temp_dir, "history.gif")

        create_history_gif(
            task="a",
            history=history,
            output_path=gif_path,
            show_task=False,
            show_logo=False,
            show_goals=True,
            title_font_size=20,
            goal_font_size=20,
            font_size=20,
            margin=20,
        )

        images = _convert_gif_to_images(gif_path)

        for idx, image in enumerate(images):
            image.save(os.path.join(temp_dir, f"history-{idx}.png"))
            _evidence = s3_client.upload_file(
                file_path=os.path.join(temp_dir, f"history-{idx}.png"),
                object_name=f"{task_id}/{idx}.png",
                content_type="image/png",
            )

            if _evidence is not None:
                evidences.append(_evidence)

    return evidences


def _convert_gif_to_images(gif_path: str) -> list[Image.Image]:
    gif = Image.open(gif_path)

    # Store frames in a list
    frames = []

    # Iterate over each frame
    try:
        while True:
            frame = gif.copy()
            frames.append(frame)
            gif.seek(gif.tell() + 1)
    except EOFError:
        pass  # End of sequence

    return frames


def _create_browser_context(
    browser: Browser, cookie_file: _TemporaryFileWrapper
) -> BrowserContext:
    return BrowserContext(
        browser=browser,
        config=BrowserContextConfig(
            cookies_file=cookie_file.name,
            minimum_wait_page_load_time=1,
            wait_for_network_idle_page_load_time=1,
            viewport_expansion=0,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246",
            browser_window_size=BrowserContextWindowSize(width=1920, height=1080),
        ),
    )
