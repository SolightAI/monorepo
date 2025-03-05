import re
import os
import json
import base64
import asyncio
import requests

from pydantic import SecretStr
from langchain_openai import ChatOpenAI
from langchain_openai import AzureChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage
from browser_use.browser.context import BrowserContext
from browser_use import Agent, Controller, ActionResult, Browser, BrowserConfig, BrowserContextConfig
# from browser_use.agent.gif import create_history_gif


SCREENSHOT_PATH = "outputs/screenshots"
VIEWPORT_SIZE = {'width': 430, 'height': 932} # iPhone 14 Pro Max


NUMBER_OF_TIMES_TO_CHECK_DOM = 5
NUMBER_OF_SCREENSHOTS_TO_TAKE_PER_ISSUE = 3
NUMBER_OF_TIMES_TO_VERIFY_ISSUE_ON_SCREENSHOT = 3


# check responsiveness of the website
RESPONSIVENESS_ANALYSIS_PROMPT = """\
You're reading the source code of a website, you're goal is to find the issues in the display related to responsiveness.
You must focus on the mobile format of the website (iPhone 14 Pro Max).

Here is the DOM of the website:
{dom}

For each issue, provide a detailed description of the issue and of where to visually find it.
Describe visually the issue and where to find it without writing any html/css code. Be super descriptive in your answer.

Before finishing, be sure that you've checked all the issues.

Add "<issue>" before each issue and add "</issue>" after each issue you've found (if any).

At the end of your answer, write the number of issues you've found in the following format: <number_of_issues>[NUMBER_OF_ISSUES]</number_of_issues>
i.e. <number_of_issues>100</number_of_issues>
""".strip()


# take a screenshot of a given website an given issue
ISSUE_SCREENSHOT_AGENT_PROMPT = """\
You're goal is to take a screenshot of the given issue.

Here is the issue:
{issue}

Save the screenshot in the given folder: {output_folder}
Name the screenshot like this: {screenshot_name}

If the issue is not visible despite looking for it, skip it and output "skipped" (without quotes).
If the task failed, also output "skipped" (without quotes).

Given the issue, take the screenshot. Once done, output the path of the screenshot without anything else.
i.e. "path/to/screenshot1.png" (without quotes)
""".strip()


VERIFY_ISSUE_PROMPT = """\
Looking at the screenshot, do you see the mentioned issue?
If yes, output "yes". If no, output "no". (no quotes) Do not output anything else except than "yes" or "no".

{issue}
""".strip()


controller = Controller()


def get_number_of_issues(response: str) -> int:
    pattern = r'<number_of_issues>\s*([\d,]+)\s*</number_of_issues>'
    match = re.search(pattern, response)
    if match:
        return int(match.group(1).replace(',', ''))
    print("No number of issues found in response:", response)
    return 0


def filter_dom(dom: str) -> tuple:
    removed_content = []

    def remove_and_store(pattern, dom):
        matches = re.findall(pattern, dom, flags=re.DOTALL)
        removed_content.extend(matches)
        return re.sub(pattern, '', dom, flags=re.DOTALL)

    # Remove the content of every script tag
    script_pattern = r'<script[^>]*>(.*?)</script>'
    dom = remove_and_store(script_pattern, dom)

    # Remove the content of every iframe tag
    iframe_pattern = r'<iframe[^>]*>(.*?)</iframe>'
    dom = remove_and_store(iframe_pattern, dom)

    # Remove the content of every svg tag
    svg_pattern = r'<svg[^>]*>(.*?)</svg>'
    dom = remove_and_store(svg_pattern, dom)

    return dom, removed_content


async def analyze_website_dom(agent: ChatOpenAI, dom: str):
    message = HumanMessage(
        content=[
            {"type": "text", "text": RESPONSIVENESS_ANALYSIS_PROMPT.format(dom=dom)},
        ],
    )

    return await agent.ainvoke(
        [message],
    )


async def evaluate_responsiveness_based_on_dom(website_url: str, output_folder: str) -> list[str]:

    dom = requests.get(website_url).text
    after_filter, _ = filter_dom(dom)

    os.makedirs(output_folder, exist_ok=True)

    agent = ChatOpenAI(model="o3-mini")

    try:
        responses = await asyncio.gather(*[analyze_website_dom(agent, dom) for _ in range(NUMBER_OF_TIMES_TO_CHECK_DOM)])
        print(f"Retrieved response for full DOM")
    except Exception as e:
        responses = await asyncio.gather(*[analyze_website_dom(agent, after_filter) for _ in range(NUMBER_OF_TIMES_TO_CHECK_DOM)])
        print(f"Retrieved response for filtered DOM")

    AGENT_LLM = AzureChatOpenAI(
        model="gpt-4o",
        api_version='2024-10-21',
        azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT', ''),
        api_key=SecretStr(os.getenv('AZURE_OPENAI_KEY', '')),
        temperature=0.0,
    )

    responses = [response.content for response in responses]

    issues = await AGENT_LLM.ainvoke(
        [HumanMessage(content=f"Deduplicate the following issues while keeping the same formating: {responses}")],
    )

    issues = re.findall(r'<issue>(.*?)</issue>', issues.content, re.DOTALL)
    issues = [issue.strip() for issue in issues if issue.strip()]

    with open(f"{output_folder}/unfiltered_responsiveness.json", "w") as f:
        json.dump(issues, f, indent=4)

    return issues


@controller.action('Take screenshot of viewport to a given folder')
async def action_take_screenshot(output_folder: str, name_of_the_issue: str, browser: BrowserContext):
    """Take a screenshot of the current viewport (visible area) and save it to the specified path"""

    try:

        # Create directory if it doesn't exist
        os.makedirs(output_folder, exist_ok=True)

        # Take the screenshot of viewport only (full_page=False)
        screenshot_b64 = await browser.take_screenshot(full_page=False)

        # Decode base64 and save to file
        screenshot_data = base64.b64decode(screenshot_b64)

        with open(f"{output_folder}/{name_of_the_issue}.png", 'wb') as f:
            f.write(screenshot_data)

        return ActionResult(
            extracted_content=f"Viewport screenshot saved to {output_folder}/{name_of_the_issue}.png",
            include_in_memory=True
        )

    except Exception as e:
        print(f"ERROR: Failed to take screenshot {e}")
        raise e


async def _take_screenshot_of_issue(website_url: str, issue: str, output_folder: str, screenshot_name: str):

    browser = Browser(
        config=BrowserConfig(
            headless=True,
            chrome_instance_path=os.getenv("CHROME_INSTANCE_PATH", None)
        )
    )

    browser_context = BrowserContext(browser=browser, config=BrowserContextConfig(
        cookies_file=os.getenv("COOKIES_FILE", None),
        minimum_wait_page_load_time=1,
        browser_window_size=VIEWPORT_SIZE,
        viewport_expansion=0, # force the viewport to be the same size as the window
    ))

    AGENT_LLM = AzureChatOpenAI(
        model="gpt-4o",
        api_version='2024-10-21',
        azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT', ''),
        api_key=SecretStr(os.getenv('AZURE_OPENAI_KEY', '')),
        temperature=0.0,
    )

    try:

        os.makedirs(output_folder, exist_ok=True)

        task = ISSUE_SCREENSHOT_AGENT_PROMPT.format(
            issue=issue,
            output_folder=output_folder,
            screenshot_name=screenshot_name,
        )

        print("Prompt for the agent: ", task)

        agent = Agent(
            task=task,
            llm=AGENT_LLM,
            browser_context=browser_context,
            initial_actions=[{'go_to_url': {'url': website_url}}],
            controller=controller,
            # generate_gif=os.path.join(output_folder, "gif", f"{issue[:min(20, len(issue))]}.gif"),
        )

        history = await agent.run(max_steps=30)
        # create_history_gif(
        #     task=ISSUE_SCREENSHOT_AGENT_PROMPT.format(issue=issue, output_folder=output_folder),
        #     history=history,
        #     output_path=os.path.join(output_folder, "gif", f"{issue[:min(20, len(issue))]}.gif"),
        #     show_task=False,
        #     show_goals=True,
        #     show_logo=False,
        # )

    except Exception as e:
        print(f"ERROR: Failed to take screenshot {e}")
        raise e

    finally:
        await browser_context.close()
        await browser.close()

    result = history.final_result()

    if result == "skipped":
        return None

    if not os.path.exists(result):
        return None

    return result


async def take_screenshots_of_issue(website_url: str, issue: str, output_folder: str):
    coroutines = []

    folder_name = issue[:min(50, len(issue))].strip().translate(str.maketrans("", "", "*:'\",;.\n")).replace("  ", " ")

    for try_number in range(NUMBER_OF_SCREENSHOTS_TO_TAKE_PER_ISSUE):
        coroutines.append(_take_screenshot_of_issue(
            website_url=website_url,
            issue=issue,
            output_folder=os.path.join(output_folder, folder_name),
            screenshot_name=f"{try_number}.png",
        ))

    paths = await asyncio.gather(*coroutines)
    paths = [path for path in paths if path is not None]

    if len(paths) == 0:
        os.rmdir(os.path.join(output_folder, folder_name))
        return None

    # NOTE: for now, we only take one screenshot, but
    # the verify_issues_using_screenshots function could use multiple screenshots
    return paths[0]


async def _verify_issue_using_screenshot(issue: str, screenshot_path: str) -> bool:

    if NUMBER_OF_TIMES_TO_VERIFY_ISSUE_ON_SCREENSHOT % 2 == 0:
        raise ValueError("number_of_validations must be odd to prevent ties")

    agent = ChatAnthropic(model="claude-3-5-sonnet-latest")

    image_data = base64.b64encode(open(screenshot_path, "rb").read()).decode("utf-8")

    message = HumanMessage(
        content=[
            {"type": "text", "text": VERIFY_ISSUE_PROMPT.format(issue=issue)},
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/{screenshot_path.split('.')[-1]};base64,{image_data}"},
            },
        ],
    )

    coroutines = [agent.ainvoke([message]) for _ in range(NUMBER_OF_TIMES_TO_VERIFY_ISSUE_ON_SCREENSHOT)]
    responses = await asyncio.gather(*coroutines)
    responses = [response.content.strip().lower() for response in responses]

    if responses.count("yes") > responses.count("no"):
        return True
    elif responses.count("no") > responses.count("yes"):
        return False
    else:
        raise ValueError("Tie in the number of validations")


async def verify_issues_using_screenshots(issues: list[str], screenshots: list[str]) -> list[dict]:
    output = []

    coroutines = []
    issues_to_verify = []
    screenshots_to_verify = []

    for issue, screenshot in zip(issues, screenshots):

        if screenshot is None:
            continue

        issues_to_verify.append(issue)
        screenshots_to_verify.append(screenshot)
        coroutines.append(_verify_issue_using_screenshot(issue, screenshot))

    print(f"Found {len(issues_to_verify)} screenshots to verify")
    results = await asyncio.gather(*coroutines)

    for issue, result, path in zip(issues_to_verify, results, screenshots_to_verify):
        if result is False:
            continue

        output.append({"issue": issue, "path": path})

    return output


async def validate_candidate_issues(issues: list[str], website_url: str, page_name: str) -> list[str]:
    coroutines_take_screenshots = []

    screenshots = []
    for issue in issues:
        screenshots.append(await take_screenshots_of_issue(
            website_url=website_url,
            issue=issue,
            output_folder=f"outputs/{page_name}",
        ))
        # coroutines_take_screenshots.append(take_screenshots_of_issue(
        #     website_url=website_url,
        #     issue=issue,
        #     output_folder=f"outputs/{page_name}",
        # ))

    # screenshots = await asyncio.gather(*coroutines_take_screenshots)
    print(f"Tried to take screenshots for {len(screenshots)} issues")

    issues_found = await verify_issues_using_screenshots(issues, screenshots)
    print(f"Kept {len(issues_found)} issues")

    with open(f"outputs/{page_name}/filtered_responsiveness.json", "w") as f:
        json.dump(issues_found, f, indent=4)

    return {"page_name": issues_found}


def get_page_name(website_url: str) -> str:
    return website_url.split(".com")[1].strip("/").replace("/", "_")


async def main():

    PAGES_TO_EVALUATE = [
        "https://www.predictiveindex.com/software/managing/",
        "https://www.predictiveindex.com/software/",
        "https://www.predictiveindex.com/science/",
        "https://www.predictiveindex.com/pi-for-hr-leaders/",
        "https://www.predictiveindex.com/pi-for-managers/",
        "https://www.predictiveindex.com/consultants/",
    ]

    # Skip pages that have already been evaluated
    for i in range(len(PAGES_TO_EVALUATE) - 1, -1, -1):
        if os.path.exists(f"outputs/{get_page_name(PAGES_TO_EVALUATE[i])}/filtered_responsiveness.json"):
            PAGES_TO_EVALUATE.pop(i)

    # TODO: model should be ran twice as sometimes it doesn't find all the issues
    # (and deduplicate using a third llm call)
    coroutines_evaluate = []
    for website in PAGES_TO_EVALUATE:
        page_name = get_page_name(website)
        coroutines_evaluate.append(evaluate_responsiveness_based_on_dom(
            website_url=website,
            output_folder=f"outputs/{page_name}",
        ))

    issues_per_page = await asyncio.gather(*coroutines_evaluate)

    coroutines = []
    for _issues, website in zip(issues_per_page, PAGES_TO_EVALUATE):
        coroutines.append(validate_candidate_issues(
            issues=_issues,
            website_url=website,
            page_name=get_page_name(website),
        ))
    await asyncio.gather(*coroutines)

    final_output = {}
    for page_name in os.listdir("outputs"):
        if not os.path.exists(f"outputs/{page_name}/filtered_responsiveness.json"):
            continue

        with open(f"outputs/{page_name}/filtered_responsiveness.json", "r") as f:
            final_output[page_name] = json.load(f)

    with open("outputs/responsiveness.json", "w") as f:
        json.dump(final_output, f, indent=4)


if __name__ == "__main__":
    asyncio.run(main())
