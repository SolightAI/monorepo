import os
import json
import boto3

from tqdm import tqdm
from notion_client import Client


def _load_results(output_dir: str):
    results = {}

    for section in os.listdir(output_dir):

        if not os.path.isdir(f"{output_dir}/{section}"):
            continue

        results[section] = {}
        for result_file in os.listdir(f"{output_dir}/{section}"):

            if not result_file.endswith(".json") or not result_file.startswith("results_"):
                continue

            test_category = result_file.split("_")[1]

            results[section][test_category] = json.load(open(f"{output_dir}/{section}/{result_file}", "r"))

    return results


def generate_report(output_dir: str):

    # Load test results from output directory
    results = _load_results(output_dir)

    # Generate report in markdown format
    output_md = ""
    for (section, test_categories) in results.items():
        output_md += f"## {section}\n"
        for (test_category, test_results) in test_categories.items():

            test_category_name = test_category.split(".")[1]
            test_category_name = test_category_name[0].upper() + test_category_name[1:].lower()

            output_md += f"### {test_category_name}\n"
            for test_result in test_results:

                output_md += "✅" if test_result['success'] else "❌"
                output_md += f" **{test_result['test_id']}** - {test_result['test_description']}\n"

                if test_result['success'] is False:
                    output_md += f"{test_result['reason']}\n"

                output_md += "\n"

    with open(f"{output_dir}/results.md", "w+") as f:
        f.write(output_md)


def upload_to_s3(file_path, object_name):
    """Upload a file to an S3 bucket and return its URL."""

    s3_client = boto3.client(
        "s3",
        endpoint_url=os.environ["AWS_ENDPOINT_URL"],
        aws_access_key_id=os.environ["AWS_ACCESS_KEY"],
        aws_secret_access_key=os.environ["AWS_SECRET_KEY"]
    )

    s3_client.upload_file(
        file_path,
        os.environ["AWS_BUCKET_NAME"],
        object_name,
        ExtraArgs={'ACL': 'public-read'}
    )

    return f"https://{os.environ['AWS_BUCKET_NAME']}.s3.fr-par.scw.cloud/{os.environ['AWS_BUCKET_NAME']}/{object_name}"


def upload_report_to_notion(output_dir: str):
    notion = Client(auth=os.getenv("NOTION_API_KEY"))
    results = _load_results(output_dir)

    PAGE_TITLE = "results vx.x.x"
    PARENT_DATABASE_ID = os.getenv("PARENT_DATABASE_ID")

    # First create the empty page
    page = notion.pages.create(
        parent={
            "type": "database_id",
            "database_id": PARENT_DATABASE_ID
        },
        properties={
            "Name": {
                "title": [{"text": {"content": PAGE_TITLE}}],
            },
        },
        children=[]  # Start with empty children
    )
    page_id = page["id"]

    # Then add sections incrementally
    for section, test_categories in tqdm(results.items(), desc="Uploading sections results"):
        section_blocks = []

        # Add section heading
        section_blocks.append({
            "object": "block",
            "type": "heading_1",
            "heading_1": {"rich_text": [{"text": {"content": section}}]}
        })

        # Add test categories
        for test_category, test_results in tqdm(test_categories.items(), desc=f"Processing {section}", leave=False):
            test_category_name = test_category.split(".")[1]
            test_category_name = test_category_name[0].upper() + test_category_name[1:].lower()

            category_blocks = []

            # Add category heading
            category_blocks.append({
                "object": "block",
                "type": "heading_2",
                "heading_2": {"rich_text": [{"text": {"content": test_category_name}}]}
            })

            # Add test results
            for test_result in tqdm(test_results, desc=f"Processing {test_category_name}", leave=False):

                rich_text = [
                    {"type": "text", "text": {"content": "✅ " if test_result['success'] else "❌ " if test_result.get('internal_error', False) is False else "❗️ "}},
                    {"type": "text", "text": {"content": test_result['test_id']}, "annotations": {"bold": True}},
                    {"type": "text", "text": {"content":  f" - {test_result['test_description']}"}, "annotations": {"italic": True}}
                ]

                if test_result['success']:
                    category_blocks.append({
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": rich_text,
                            "color": "default"
                        }
                    })

                else:
                    gif_url = upload_to_s3(
                        file_path=f"{output_dir}/{section}/gifs/{test_result['test_id']}.gif",
                        object_name=f"{section}/gifs/{test_result['test_id']}.gif"
                    )

                    category_blocks.append({
                        "type": "toggle",
                        "toggle": {
                            "rich_text": rich_text,
                            "color": "default",
                            "children": [
                                {
                                    "object": "block",
                                    "type": "paragraph",
                                    "paragraph": {
                                        "rich_text": [{"type": "text", "text": {"content": test_result['reason']}}],
                                        "color": "default"
                                    }
                                },
                                {
                                    "object": "block",
                                    "type": "image",
                                    "image": {
                                        "type": "external",
                                        "external": {"url": gif_url}
                                    }
                                }
                            ]
                        }
                    })

            # Add category blocks to section
            section_blocks.extend(category_blocks)

        # Append the entire section to Notion
        notion.blocks.children.append(
            block_id=page_id,
            children=section_blocks
        )
