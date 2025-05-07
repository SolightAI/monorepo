import base64
import httpx
import logging
import asyncio

from browser_use import Agent
from langchain_openai import ChatOpenAI
from browser_use.browser.browser import BrowserContext
from langchain_core.messages import HumanMessage
from utils.constants import TWOCAPTCHA_API_KEY, SEED


logger = logging.getLogger(__name__)

LLM_CLIENT = ChatOpenAI(
    model="gpt-4.1",
    temperature=0.0,
    seed=SEED,
)

PROMPT = """
You are a helpful AI assistant capable of solving text captchas. Your task is to analyze a given captcha image and identify the characters present in it. Here's what you need to do:

1. You will be provided with a captcha image.

2. If it's not a text captcha, return that you cannot solve it.

3. Carefully analyze the image. Pay attention to the following:
   - The shape and style of the characters
   - Any distortions or overlaps in the characters
   - The number of characters present
   - Any background patterns or noise that might be present

4. After analyzing the image, provide your answer in the following format:
   <captcha_solution>Insert the characters you've identified here, with no spaces between them</captcha_solution>

5. Remember:
   - Captchas can contain both letters (uppercase and lowercase) and numbers
   - Be as accurate as possible in your identification
   - If a character is ambiguous, use your best judgment to determine what it is
   - Do not include any characters that are clearly part of the background or noise
   - If you cannot identify a character with reasonable certainty, return that you're not sure about the characters

Provide your solution to the captcha based on the image description given.
"""


async def _solve_using_twocaptcha(captcha_image_src: str) -> str:
    """Solve a captcha using the capsolver API"""

    async with httpx.AsyncClient() as client:

        response = await client.get(captcha_image_src)

        payload = {
            "clientKey": TWOCAPTCHA_API_KEY,
            "task": {
                "type": "ImageToTextTask",
                "body": base64.b64encode(response.content).decode("utf-8"),
                "phrase": False,
                "case": True,
                "numeric": 0,
                "math": False,
                "minLength": 3,
                "maxLength": 10,
                "comment": "enter the text you see on the image"
            },
            "languagePool": "en"
        }

        response = await client.post(
            "https://api.2captcha.com/createTask",
            json=payload,
        )

        body = response.json()

        logger.info(f"Response: {body}")

        if "solution" in body and "text" in body["solution"]:
            return body["solution"]["text"]

        task_id = body["taskId"]

        for _ in range(60):
            response = await client.post(

                "https://api.2captcha.com/getTaskResult",
                json={
                    "clientKey": TWOCAPTCHA_API_KEY,
                    "taskId": task_id,
                },
            )

            if response.status_code != 200:
                raise Exception(f"Failed to get task result ({response.status_code}): {response.text}")

            body = response.json()

            if body["errorId"] != 0:
                raise Exception(f"Failed to get task result ({body['errorId']}): {body['errorDescription']}")

            if body["status"] == "ready":
                return body["solution"]["text"]

            await asyncio.sleep(1)

    raise Exception("Failed to solve captcha using twocaptcha (timeout)")


async def get_text_from_captcha(browser: BrowserContext) -> str:
    """Get the text of a captcha.

    The text returned is the text to type to solve the captcha.
    The text won't be entered, you need to do it yourself.

    Returns:
        str: The text of the captcha
    """

    page = await browser.get_current_page()
    screenshot = await page.screenshot()

    captcha_image_src = await page.locator("img[id='captchaimg']").get_attribute("src")

    # we use the twocaptcha API for google 'normal' captcha
    if captcha_image_src:
        captcha_image_src = "https://accounts.google.com" + captcha_image_src

        logger.info(f"Captcha image src: {captcha_image_src}")

        solution = await _solve_using_twocaptcha(captcha_image_src)

        logger.info(f"Captcha solution: {solution}")

        return solution

    image_data = base64.b64encode(screenshot).decode("utf-8")

    message = {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": PROMPT,
            },
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{image_data}"},
            },
        ],
    }

    result: str = (await LLM_CLIENT.ainvoke([message])).content  # type: ignore

    logger.info(f"Result from LLM: {result}")

    return result


async def check_for_captcha(agent: Agent) -> None:
    """Check if a captcha is present on the page"""

    task_id = agent._task_id if hasattr(agent, "_task_id") else "?"

    # We don't try to use locator before the browser context is created
    if agent._current_step == 1:
        logger.info(f"[{task_id}] Captcha check skipped (first step)")
        return

    page = await agent.browser_context.get_current_page()

    try:
        content = await page.content()
    except:  # noqa: E722
        # one more short wait then retry
        logger.warning(f"[{task_id}] page.content failed cause page was loading, retrying...")
        await page.wait_for_load_state("networkidle")
        content = await page.content()

    if "captchaimg" not in content:
        logger.info(f"[{task_id}] No captcha found on the page")
        return

    try:
        captcha_image_src = await page.locator("img[id='captchaimg']").get_attribute("src")
    except Exception:
        logger.warning(f"[{task_id}] page.locator timed out")
        return

    if captcha_image_src is None:
        return

    if hasattr(agent, "_found_captcha") and agent._found_captcha:
        content = "You already tried to solve this captcha, it failed. End all your actions and inform the user of the failure."
        logger.info(f"[{task_id}] Adding to agent's history: {content}")

        agent_message = HumanMessage(content=content)
        agent.message_manager._add_message_with_tokens(agent_message)
        return

    agent._found_captcha = True

    logger.info(f"[{task_id}] Found a captcha on the page, solving it and informing the agent")

    captcha_text = await get_text_from_captcha(agent.browser_context)

    content = f"There is a captcha on the page, the text to type is: {captcha_text}"
    logger.info(f"[{task_id}] Adding to agent's history: {content}")

    agent_message = HumanMessage(content=content)
    agent.message_manager._add_message_with_tokens(agent_message)
