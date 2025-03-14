import os
import json
import asyncio
from logging import getLogger

from step2_get_website_sections.agent import WebsiteSections
from step3_get_documented_sections.agent import generate_section_documentation

from prefect import flow


HEADLESS = bool(os.getenv("HEADLESS", "True"))

logger = getLogger(__name__)


@flow(name="Document sections")
async def step3_get_documented_sections(
    website_url: str,
    website_documentation: str,
    website_sections: WebsiteSections,
    output_folder: str,
) -> WebsiteSections:
    """Get documented sections based on sections."""

    try:
        with open(f"{output_folder}/documented_sections.json", "r") as f:
            documented_sections = WebsiteSections.model_validate(json.load(f))
    except FileNotFoundError:
        coroutines = []
        for section in website_sections.sections:
            coroutines.append(generate_section_documentation(website_url, website_documentation, section, headless=HEADLESS))
        documented_sections = await asyncio.gather(*coroutines)
        documented_sections = WebsiteSections(sections=documented_sections)

        # Save documented sections
        os.makedirs(output_folder, exist_ok=True)
        with open(f"{output_folder}/documented_sections.json", "w") as f:
            json.dump(documented_sections.model_dump(), f, indent=4)

    return documented_sections
