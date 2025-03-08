import os
import json

from logging import getLogger
from step2_get_website_sections.agent import generate_website_sections, WebsiteSections
from prefect import flow


HEADLESS = bool(os.getenv("HEADLESS", "True"))

logger = getLogger(__name__)


@flow(name="Generate website sections")
async def step2_get_website_sections(website_url: str, website_documentation: str, output_folder: str) -> WebsiteSections:
    """Get website sections based on website_documentation."""

    try:
        with open(f"{output_folder}/website_sections.json", "r") as f:
            sections = WebsiteSections.model_validate(json.load(f))
    except FileNotFoundError:
        sections = await generate_website_sections(website_url, website_documentation, headless=HEADLESS)
        os.makedirs(output_folder, exist_ok=True)
        with open(f"{output_folder}/website_sections.json", "w") as f:
            json.dump(sections.model_dump(), f, indent=4)

    return sections
