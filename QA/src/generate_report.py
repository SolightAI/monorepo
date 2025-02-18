import os
import json


def generate_report(output_dir: str):

    # Load test results from output directory
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


# from notion_client import Client
# def upload_report_to_notion():

#     notion = Client(auth="your_notion_api_key")

#     PAGE_TITLE = "QA - Results"

#     response = notion.pages.create(
#         # cover={
#         #     "type": "external",
#         #     "external": {
#         #         "url": "https://upload.wikimedia.org/wikipedia/commons/6/62/Tuscankale.jpg"
#         #     }
#         # },
#         # icon={
#         #     "type": "emoji",
#         #     "emoji": "🥬"
#         # },
#         parent={
#             "type": "database_id",
#             "database_id": "d9824bdc-8445-4327-be8b-5b47500af6ce"
#         },
#         properties={
#             "Name": {
#                 "title": [
#                     {
#                         "text": {
#                             "content": PAGE_TITLE
#                         }
#                     }
#                 ]
#             },
#             "Description": {
#                 "rich_text": [
#                     {
#                         "text": {
#                             "content": "Results of the QA tests"
#                         }
#                     }
#                 ]
#             },
#             # "Food group": {
#             #     "select": {
#             #         "name": "🥬 Vegetable"
#             #     }
#             # }
#         },
#         children=[
#             {
#                 "object": "block",
#                 "type": "heading_2",
#                 "heading_2": {
#                     "rich_text": [
#                         {
#                             "text": {
#                                 "content": "Lacinato kale"
#                             }
#                         }
#                     ]
#                 }
#             },
#             {
#                 "object": "block",
#                 "type": "paragraph",
#                 "paragraph": {
#                     "rich_text": [
#                         {
#                             "text": {
#                                 "content": "Lacinato kale is a variety of kale with a long tradition in Italian cuisine, especially that of Tuscany. It is also known as Tuscan kale, Italian kale, dinosaur kale, kale, flat back kale, palm tree kale, or black Tuscan palm.",
#                                 "link": {
#                                     "url": "https://en.wikipedia.org/wiki/Lacinato_kale"
#                                 }
#                             }
#                         }
#                     ],
#                     "color": "default"
#                 }
#             }
#         ]
#     )

#     print(response)
