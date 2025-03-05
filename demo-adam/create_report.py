import os
import json
import asyncio

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage


OUTPUT_FILE = "outputs/report.md"

async def create_report():
    # content = ""
    # content_per_page = {}


    # for page_name in os.listdir("outputs"):
    #     path_to_page_dir = os.path.join("outputs", page_name)

    #     if not os.path.isdir(path_to_page_dir):
    #         continue

    #     path_to_page_txt = os.path.join(path_to_page_dir, "responsiveness.txt")

    #     with open(path_to_page_txt, "r") as f:
    #         data = f.read()

    #     content_per_page[page_name] = data


    # for page_name, _content_on_page in content_per_page.items():
    #     content += f"## {page_name}\n\n"
    #     content += f"{_content_on_page}\n\n"

    with open("outputs/responsiveness.json", "r") as f:
        content = json.load(f)

    content = {k: v for (k, v) in content.items() if len(v) > 0}

    # model = ChatOpenAI(model="gpt-4o")
    model = ChatOpenAI(model="gpt-4.5-preview")

    message = HumanMessage(
        content=[
            {"type": "text", "text": "Create a report in markdown format of the following content:\n\n" + json.dumps(content, indent=4)},
        ],
    )

    response = await model.ainvoke(
        [message],
    )

    with open(OUTPUT_FILE, "w") as f:
        f.write(response.content)


if __name__ == "__main__":
    asyncio.run(create_report())
