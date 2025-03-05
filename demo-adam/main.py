import re
import os
import json
import base64
import asyncio
import requests
import xml.etree.ElementTree as ET

from datetime import datetime
from pydantic import SecretStr
from langchain_openai import ChatOpenAI
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage
from browser_use.browser.context import BrowserContext
from browser_use import Agent, Controller, ActionResult, Browser, BrowserConfig, BrowserContextConfig


SCREENSHOT_PATH = "outputs/screenshots"


PAGES_TO_EVALUATE = [
    "https://www.predictiveindex.com/software/managing/",
    "https://www.predictiveindex.com/software/",
    "https://www.predictiveindex.com/science/",
    "https://www.predictiveindex.com/pi-for-hr-leaders/",
    "https://www.predictiveindex.com/pi-for-managers/",
    "https://www.predictiveindex.com/consultants/",
]


# check responsiveness of the website
RESPONSIVENESS_ANALYSIS_PROMPT = """\
You're reading the source code of a website, you're goal is to find the issues in the display related to responsiveness.
You must focus on the mobile format of the website (iPhone 14 Pro Max).

Here is the DOM of the website:
{dom}

For each issue, provide a detailed description of the issue and of where to visually find it.
Describe visually the issue and where to find it without writing any html/css code. Be super descriptive in your answer.

Before finishing, be sure that you've checked all the issues.

At the end of your answer, write the number of issues you've found in the following format: <number_of_issues>[NUMBER_OF_ISSUES]</number_of_issues>
i.e. <number_of_issues>100</number_of_issues>
""".strip()


# take two screenshots of a given website an given user journey (aka flow)
FLOW_SCREENSHOT_AGENT_PROMPT = """\
You're goal is to take two screenshots of a given website an given user journey (aka flow).
One screenshot must be taken before doing the defined action to do, the other one after.

Here is the user journey:
{flow}

Given the user journey, take the two screenshots. Once done, output the path to the two screenshots in a list format.
i.e ["path/to/screenshot1.png", "path/to/screenshot2.png"]

Note that your output must only contain the paths to the screenshots, nothing else. No text, no explanation, nothing.
""".strip()


# output an evaluation of the flow
FLOW_EVALUATION_PROMPT = """\
You're goal is to analyze a user journey (aka flow) and say if it's good or if needs to be improved.
To analyze the flow, you will be given two screenshots from a same website showing the user flow.

Given the two screenshots, say if the user flow is good enough or if needs to be improved.
Here is the flow to analyze: {flow}

One quick note: do not mention the cookie consent banner in your answer.
""".strip()


# output: yes or no
CHECK_IF_ISSUE_IN_FLOW_PROMPT = """\
Here a some feedbacks on a provided evaluation of a given user flow.
Given the evaluation results, does the flow requires improvements ("yes") or is the flow good ("no"). Output only yes or no, nothing else.

Here is the evaluation:
{evaluation}
""".strip()


# transform the evaluation into a list of issues
FLOW_EVALUATION_PARSING_PROMPT = """\
Here a some feedbacks on a provided evaluation of a given user flow.
Structure the output of the evaluation like this: <issues><issue><description></description><suggestion></suggestion></issue> ... </issues>
Do not include any other text, formatting or comments in your output.

Here is the evaluation:
{evaluation}
""".strip()


BUG_ANALYSIS_PROMPT = """\
When I click on the "Become a Partner" button, I see that the front isn't properly displayed, it's not centered vertically.
I also have the same problem when clicking on one of the  following buttons:
- What is a PI Partnership?
- How does it work?
- Who is an ideal PI Partner?
- Why partner with PI?
The section is not centered vertically.

Read the DOM of the website and find the source of the issue.

Here is the DOM of the website:
{dom}
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


async def look_for_bugs_in_website_dom(agent: ChatOpenAI, dom: str):
    message = HumanMessage(
        content=[
            {"type": "text", "text": BUG_ANALYSIS_PROMPT.format(dom=dom)},
        ],
    )

    return await agent.ainvoke(
        [message],
    )



async def evaluate_responsiveness(website_url: str, output_folder: str):

    dom = requests.get(website_url).text
    after_filter, _ = filter_dom(dom)

    os.makedirs(output_folder, exist_ok=True)

    agent = ChatOpenAI(model="o3-mini")

    try:
        response = await analyze_website_dom(agent, dom)
        print(f"Retrieved response for full DOM")
    except Exception as e:
        response = await analyze_website_dom(agent, after_filter)
        print(f"Retrieved response for filtered DOM")

    with open(f"{output_folder}/responsiveness.txt", "w") as f:
        f.write(response.content)


@controller.action('Take screenshot of viewport')
async def action_take_screenshot(browser: BrowserContext):
    """Take a screenshot of the current viewport (visible area) and save it to the specified path"""

    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Create directory if it doesn't exist
        os.makedirs(SCREENSHOT_PATH, exist_ok=True)

        # Take the screenshot of viewport only (full_page=False)
        screenshot_b64 = await browser.take_screenshot(full_page=False)

        # Decode base64 and save to file
        screenshot_data = base64.b64decode(screenshot_b64)

        with open(f"{SCREENSHOT_PATH}/{timestamp}.png", 'wb') as f:
            f.write(screenshot_data)

        return ActionResult(
            extracted_content=f"Viewport screenshot saved to {SCREENSHOT_PATH}/{timestamp}.png",
            include_in_memory=True
        )

    except Exception as e:
        print(f"ERROR: Failed to take screenshot {e}")
        raise e



async def take_screenshots_of_flow(website_url: str, flow: str):

    browser = Browser(
        config=BrowserConfig(
            headless=True,
            chrome_instance_path=os.getenv("CHROME_INSTANCE_PATH", None)
        )
    )

    browser_context = BrowserContext(browser=browser, config=BrowserContextConfig(
        cookies_file=os.getenv("COOKIES_FILE", None),
        minimum_wait_page_load_time=1,
    ))

    AGENT_LLM = AzureChatOpenAI(
        model="gpt-4o",
        api_version='2024-10-21',
        azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT', ''),
        api_key=SecretStr(os.getenv('AZURE_OPENAI_KEY', '')),
        temperature=0.0,
    )


    try:
        agent = Agent(
            task=FLOW_SCREENSHOT_AGENT_PROMPT.format(flow=flow),
            llm=AGENT_LLM,
            browser_context=browser_context,
            initial_actions=[{'go_to_url': {'url': website_url}}],
            controller=controller,
        )
        history = await agent.run()

    finally:
        await browser_context.close()
        await browser.close()

    try:
        return json.loads(history.final_result())
    except Exception as e:
        print(f"ERROR: Failed to get final result {history.final_result()=}")
        raise e


async def analyze_website_flow(agent: ChatOpenAI, flow: str, paths: list[str]):

    images_data = []
    for path in paths:
        with open(path, "rb") as f:
            image_data = f.read()
            images_data.append(base64.b64encode(image_data).decode("utf-8"))

    message = HumanMessage(
        content=[
            {"type": "text", "text": FLOW_EVALUATION_PROMPT.format(flow=flow)},
            *[{
                "type": "image_url",
                "image_url": {"url": f"data:image/{path.split('.')[-1]};base64,{image_data}"},
            } for path, image_data in zip(paths, images_data)]
        ],
    )

    evaluation = (await agent.ainvoke([message])).content

    message = HumanMessage(
        content=[
            {"type": "text", "text": CHECK_IF_ISSUE_IN_FLOW_PROMPT.format(evaluation=evaluation)},
        ],
    )

    issue_in_flow = (await agent.ainvoke([message])).content

    if issue_in_flow.lower().strip(".") == "yes":
        message = HumanMessage(
            content=[
                {"type": "text", "text": FLOW_EVALUATION_PARSING_PROMPT.format(evaluation=evaluation)},
            ],
        )
        output = (await agent.ainvoke([message])).content
        return parse_xml_output(output)
    elif issue_in_flow.lower().strip(".") == "no":
        return []
    else:
        raise ValueError(f"Invalid evaluation (expected yes or no): {issue_in_flow}")


def parse_xml_output(output: str) -> dict:
    # Parse the XML data
    root = ET.fromstring(output)

    # Extract data into a list of dictionaries
    data = []
    for issue in root.findall('issue'):
        description = issue.find('description').text
        suggestion = issue.find('suggestion').text
        data.append({
            'Description': description,
            'Suggestion': suggestion
        })

    return data


async def evaluate_flow(website_url: str, flow: str):
    agent = ChatOpenAI(model="gpt-4o", temperature=0.00000001)
    paths = await take_screenshots_of_flow(website_url, flow)

    return await analyze_website_flow(agent, flow, paths)


async def get_full_page_dom(website_url: str):

    browser = Browser(
        config=BrowserConfig(
            headless=False,
            chrome_instance_path=os.getenv("CHROME_INSTANCE_PATH", None)
        )
    )

    browser_context = BrowserContext(browser=browser, config=BrowserContextConfig(
        cookies_file=os.getenv("COOKIES_FILE", None),
        minimum_wait_page_load_time=10,
        user_agent="Mozilla/5.0 (X11; CrOS x86_64 8172.45.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.64 Safari/537.36",
    ))
    await browser_context.navigate_to(website_url)

    AGENT_LLM = AzureChatOpenAI(
        model="gpt-4o",
        api_version='2024-10-21',
        azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT', ''),
        api_key=SecretStr(os.getenv('AZURE_OPENAI_KEY', '')),
        temperature=0.0,
    )


    try:
        agent = Agent(
            task="Wait for 5s, then stop.",
            llm=AGENT_LLM,
            browser_context=browser_context,
            # initial_actions=[{'go_to_url': {'url': website_url}}],
            # controller=controller,
        )
        history = await agent.run()

        page = await browser_context.get_current_page()
        dom = await page.content()

    finally:
        await browser_context.close()
        await browser.close()

    return dom


async def main():

    # ========================FLOW=========================================
    # evaluation = await evaluate_flow(
    #     website_url="https://www.predictiveindex.com/software/managing/",
    #     flow="As a user, I want to click on the 'Try for Free' button",
    # )

    # evaluation = await evaluate_flow(
    #     website_url="https://www.predictiveindex.com/consultants/",
    #     flow="As a user, I want to become a partner by clicking on the 'Become a Partner' button",
    # )

    # page_name = website.split(".com")[1].strip("/").replace("/", "_")

    # print()
    # print("-" * 30, "\n")
    # for issue in evaluation:
    #     print(f"Description: {issue['Description']}")
    #     print(f"Suggestion: {issue['Suggestion']}")
    #     print("-" * 30, "\n")
    # ========================FLOW=========================================



    # ========================RESPONSIVENESS===============================
    coroutines = []
    for website in PAGES_TO_EVALUATE:
        page_name = website.split(".com")[1].strip("/").replace("/", "_")
        coroutines.append(evaluate_responsiveness(
            website_url=website,
            output_folder=f"outputs/{page_name}",
        ))

    await asyncio.gather(*coroutines)

    from create_report import create_report
    await create_report()
    # ========================RESPONSIVENESS==============================



    # ========================BUG IN DOM===============================
    # website_url = "https://www.predictiveindex.com/consultants/"
    # output_folder = "outputs/consultants"

    # dom = requests.get(website_url).text
    # after_filter, _ = filter_dom(dom)

    # with open(f"{output_folder}/dom.txt", "w") as f:
    #     f.write(dom)

    # with open(f"{output_folder}/dom_filtered.txt", "w") as f:
    #     f.write(after_filter)

    # os.makedirs(output_folder, exist_ok=True)

    # agent = ChatOpenAI(model="o3-mini")

    # try:
    #     response = await look_for_bugs_in_website_dom(agent, dom)
    #     print(f"Retrieved response for full DOM")
    # except Exception as e:
    #     response = await look_for_bugs_in_website_dom(agent, after_filter)
    #     print(f"Retrieved response for filtered DOM")

    # with open(f"{output_folder}/responsiveness.txt", "w") as f:
    #     f.write(response.content)

    # print(response.content)
    # ========================BUG IN DOM===============================



    # ========================GET FULL DOM===============================
    # dom = await get_full_page_dom("https://www.predictiveindex.com/consultants/")

    # with open(f"outputs/consultants/dom_agent.html", "w") as f:
    #     f.write(dom)
    # ========================GET FULL DOM===============================


if __name__ == "__main__":
    asyncio.run(main())
