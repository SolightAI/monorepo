import os
import json

from prefect import flow
from logging import getLogger
from step2_get_website_sections.agent import WebsiteSections
from step4_get_test_plan.agent import TestPlan, generate_test_plan


HEADLESS = bool(os.getenv("HEADLESS", "True"))


logger = getLogger(__name__)


@flow(name="Generate test plan")
async def step4_get_test_plan(website_url: str, sections: WebsiteSections, output_folder: str):
    """Step 4: Generate test plan"""

    try:
        with open(f"{output_folder}/test_plan.json", "r") as f:
            return TestPlan.model_validate(json.load(f))

    except FileNotFoundError:
        test_plan = await generate_test_plan(
            website_url=website_url,
            sections=sections,
            headless=HEADLESS,
            gif_output_folder=os.path.join(output_folder, "gifs")
        )

        with open(f"{output_folder}/test_plan.json", "w") as f:
            json.dump(test_plan.model_dump(), f, indent=4)

        return test_plan
