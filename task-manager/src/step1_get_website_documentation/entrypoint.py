import os

from prefect import flow
from logging import getLogger
from step1_get_website_documentation.agent import generate_website_documentation


HEADLESS = bool(os.getenv("HEADLESS", "True"))

logger = getLogger(__name__)


@flow(name="Generate website documentation")
async def step1_get_website_documentation(website_url: str, output_folder: str) -> str:
    """Get website documentation."""
    try:
        with open(f"{output_folder}/website_documentation.md", "r") as f:
            documentation = f.read()
    except FileNotFoundError:
        documentation = await generate_website_documentation(website_url, headless=HEADLESS)
        # Save documentation to cache
        os.makedirs(output_folder, exist_ok=True)
        with open(f"{output_folder}/website_documentation.md", "w") as f:
            f.write(documentation)

    return documentation
