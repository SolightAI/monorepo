import os
import anthropic

from pydantic import BaseModel
from xml.etree import ElementTree as ET
from retry import retry


class TestSection(BaseModel):
    name: str
    description: str


client = anthropic.AsyncAnthropic()

default_sections = [
    "UI Component Consistency: Testing of the UI components to ensure consistency across the website (Visual consistency only, no functional testing)",
    "Navigation and Menu Structure: Testing of the main navigation menu functionality, including access to all displayed sections and verification of proper navigation flow between sections.",
    "External Links: Testing of external links, specifically the QA.tech link, including proper opening in new tabs and correct destination URLs.",
]

prompt = """
You are a QA specialist tasked with identifying the key areas to test for a website based on its documentation. Your goal is to create a comprehensive list of testable sections without writing individual tests.

Here is the documentation for the website:

<documentation>
{website_documentation}
</documentation>

Analyze the provided documentation carefully. Identify the main sections of the website and any functionality that should be tested. Remember, we are not concerned with security testing nor error handling at this time.

When creating your list of testable sections:
- Focus on the main features and functionalities, do not go too atomic. We want big sections, not too many small ones.
- Group tests by sections of the website (e.g., Dashboard, Customer Management, etc.)
- In cross-functional or interdependent features, specify the dependencies between sections
- If you identify areas that don't fit into specific sections but still require testing, create appropriate categories for them

Provide a comprehensive list of test sections, each with a brief description of what should be tested. Do not include bullet points or specific test cases within each section.

Present your response in the following format:

<scratchpad>
[Scratchpad to help you think about what is asked and what to output]
</scratchpad>

<test_sections>

<section>
<name>[Section Name 1]</name>
<description>[Brief description of what should be tested in this section]</description>
</section>

<section>
<name>[Section Name 2]</name>
<description>[Brief description of what should be tested in this section]</description>
</section>

...

<section>
<name>[Additional Category (if needed)]</name>
<description>[Brief description of what should be tested in this category]</description>
</section>

</test_sections>

Ensure that your list covers all major functionalities and features described in the documentation.
"""


def parse_test_sections(xml_string: str) -> list[TestSection]:
    root = ET.fromstring(xml_string)
    sections = []

    for section in root.findall("section"):
        name = section.find("name").text
        description = section.find("description").text
        sections.append(TestSection(name=name, description=description))

    return sections


def print_test_sections(test_sections: list[TestSection]):

    output = ""

    for section in test_sections:
        output += f"== {section.name} ==\n"
        output += f"{section.description}\n"
        output += "\n"

    print(output)

    return output


# async def get_sections_to_test(website_documentation: str, *args, **kwargs) -> list[TestSection]:
#     # Replace placeholders like {{WEBSITE_DOCUMENTATION}} with real values,
#     # because the SDK does not support variables.
#     message = await client.messages.create(
#         model="claude-3-5-sonnet-20241022",
#         max_tokens=8192,
#         temperature=0,
#         messages=[
#             {
#                 "role": "user",
#                 "content": [
#                     {
#                         "type": "text",
#                         "text": prompt.format(website_documentation=website_documentation)
#                     }
#                 ]
#             }
#         ]
#     )

#     raw_output = message.content[0].text
#     raw_sections = raw_output.split("</scratchpad>")[1]

#     return parse_test_sections(raw_sections)


import os

from pydantic import SecretStr
from langchain_openai import AzureChatOpenAI
from browser_use import Agent, Browser, BrowserConfig
from logging import getLogger
from dotenv import load_dotenv
# from lmnr import Laminar


AGENT_LLM = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT', ''),
    api_key=SecretStr(os.getenv('AZURE_OPENAI_KEY', '')),
    temperature=0.0,
)


class SectionsToTest(BaseModel):
    scratchpad: str
    sections: list[TestSection]

from browser_use import Controller
import json


@retry(exceptions=Exception, tries=3, delay=1, backoff=2)
async def get_sections_to_test(url: str, website_documentation: str, headless: bool = False) -> list[TestSection]:

    browser = Browser(
        config=BrowserConfig(
            headless=headless,
            chrome_instance_path=os.getenv("CHROME_INSTANCE_PATH", None)
        )
    )

    agent = Agent(
        task=prompt.format(
            website_documentation=website_documentation,
            default_sections="\n".join([f"- {_section}" for _section in default_sections]),
        ),
        llm=AGENT_LLM,
        initial_actions=[{'go_to_url': {'url': url}}],
        browser=browser,
        generate_gif=False,
        controller=Controller(output_model=SectionsToTest),
    )

    try:
        history = await agent.run(max_steps=30)
    finally:
        await browser.close()

    result = history.final_result() # type: ignore

    if result is None:
        print("⚠️ ⚠️ Result is None ⚠️ ⚠️", end="\n\n")
        print("History:")
        print(history.action_results())
        raise Exception("Result is None")


    return SectionsToTest.model_validate(json.loads(result)).sections
