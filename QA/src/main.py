import os
import json
import asyncio

from generate_website_documentation import generate_website_documentation
from generate_section_guide import generate_section_guide
from generate_qa_tests import generate_qa_tests, print_test_plan, verify_test_plan, TestCase, TestPlan, TestCategory
from get_sections_to_test import get_sections_to_test, print_test_sections, TestSection, SectionsToTest
from run_qa_tests import run_qa_tests, test_results_to_markdown
from generate_report import generate_report, upload_report_to_notion
from create_jira_issue import create_jira_issues


async def generate_guide_for_section(website_url, website_documentation, section, headless=True):

    print(f"# ===== {section.name} ===== #")

    try:
        example_guide = await generate_section_guide(
            website_url=website_url,
            website_documentation=website_documentation,
            section_name=section.name,
            headless=headless,
        )

        os.makedirs(f"output/{section.name}", exist_ok=True)

        if example_guide is None:
            print("⚠️" * 30)
            print(f"⚠️ Skipping {section.name} because it failed to generate a guide")
            print("⚠️" * 30)
            print("")

            with open(f"output/{section.name}/guide.md", "w+") as f:
                f.write("Error generating guide")

            return

        with open(f"output/{section.name}/guide.md", "w+") as f:
            f.write(example_guide)

    except Exception as e:
        print(f"Error processing section {section.name}: {str(e)}")
        raise e


async def generate_test_plan_for_section(website_url, section, all_sections, headless=True, concurrent=True):

    print(f"# ===== {section.name} ===== #")

    try:

        with open(f"output/{section.name}/guide.md", "r") as f:
            example_guide = f.read()

        test_plan = await generate_qa_tests(
            website_url,
            example_guide,
            section,
            other_sections=[other_section for other_section in all_sections if other_section.name != section.name],
            headless=headless,
            concurrent=concurrent,
        )

        with open(f"output/{section.name}/test_plan.txt", "w+") as f:
            f.write(print_test_plan(test_plan))

        return test_plan

    except Exception as e:
        print(f"Error processing section {section.name}: {str(e)}")
        raise e


async def generate_and_save_section_guides(
    website_url: str,
    website_documentation: str,
    sections_to_test: list[TestSection],
    headless: bool = True,
    concurrent: bool = True,
):

    if concurrent:
        section_guides = await asyncio.gather(
            *(generate_guide_for_section(website_url, website_documentation, section, headless=headless)
              for section in sections_to_test)
        )
    else:
        section_guides = []
        for section in sections_to_test:
            section_guides.append(await generate_guide_for_section(website_url, website_documentation, section, headless=headless))

    print(section_guides)


async def generate_and_save_test_plans(website_url, sections_to_test, headless=True, concurrent=True):

    if concurrent:
        test_plans = await asyncio.gather(
            *(generate_test_plan_for_section(website_url, section, sections_to_test, headless=headless, concurrent=concurrent)
              for section in sections_to_test)
        )
    else:
        test_plans = []
        for section in sections_to_test:
            test_plans.append(await generate_test_plan_for_section(website_url, section, sections_to_test, headless=headless, concurrent=concurrent))

    with open("output/test_plans.json", "w+") as f:
        json.dump([
            {
                "section": section.model_dump(mode='json'),
                "test_plan": _test_plan.model_dump(mode='json'),
            }
            for section, _test_plan in zip(sections_to_test, test_plans)
        ], f)

    return json.load(open("output/test_plans.json", "r"))


async def generate_and_save_website_documentation(website_url, headless=False):

    example_website_documentation = await generate_website_documentation(website_url, headless=headless)

    with open("output/website_documentation.md", "w+") as f:
        f.write(example_website_documentation)

    return example_website_documentation


def get_default_sections():
    return [
        # TestSection(
        #     name="Dashboard",
        #     description="Test the central hub for key metrics, including the total customer count, recent customer activity, and the QA.tech link.",
        # ),
        TestSection(
            name="Customers",
            description="Test the management of customer details, including adding new customers and viewing existing ones.",
        ),
        # TestSection(
        #     name="Companies",
        #     description="Test the display and management of company information, including industry and founding year.",
        # ),
        # TestSection(
        #     name="Deals",
        #     description="Test the categorization and tracking of deals across various stages, including details like title, company, and value.",
        # ),
        # TestSection(
        #     name="UI Component Consistency",
        #     description="Test the visual consistency of UI components across the website.",
        # ),
        # TestSection(
        #     name="Navigation and Menu Structure",
        #     description="Test the functionality of the main navigation menu, ensuring access to all sections and proper navigation flow.",
        # ),
        # TestSection(
        #     name="External Links",
        #     description="Test the external link to QA.tech, ensuring it opens in a new tab and directs to the correct URL.",
        # ),
    ]


async def get_and_save_sections_to_test(website_url, example_website_documentation, headless=False):

    sections_to_test = await get_sections_to_test(website_url, example_website_documentation, headless=headless)

    with open("output/sections.json", "w+") as f:
        json.dump([_section.model_dump(mode='json') for _section in sections_to_test], f, indent=4)

    return [TestSection.model_validate(_section) for _section in json.load(open("output/sections.json", "r"))]


async def generate_and_save_qa_results(test_plans, headless=True, concurrent=True):
    for _test_plan in test_plans:

        section = TestSection.model_validate(_test_plan["section"])
        test_plan = TestPlan.model_validate(_test_plan["test_plan"])

        print(f"# ===== RUNNING TESTS FOR {section.name} ===== #")

        for (category, test_plan) in test_plan.test_cases.items():

            # FIXME: remove after debugging
            # if category.value != TestCategory.POSITIVE.value:
            #     continue

            results = await run_qa_tests(
                qa_tests=test_plan,
                headless=headless,
                gif_output_folder=f"output/{section.name}",
                concurrent=concurrent,
            )

            json.dump([_result.model_dump(mode='json') for _result in results], open(f"output/{section.name}/results_{category}.json", "w+"))


async def main():

    # website_url = "https://suno.com/"
    website_url = "https://qacrmdemo.netlify.app"

    HEADLESS = True
    CONCURRENT = True

    os.makedirs("output", exist_ok=True)

    website_documentation = open("output/website_documentation.md", "r").read()
    website_documentation = await generate_and_save_website_documentation(website_url, headless=HEADLESS)

    sections_to_test = [TestSection.model_validate(_section) for _section in [
        {"name": "Library", "description": "Test the management of songs, playlists, followers, and history, as well as the search functionality and interaction options like liking, disliking, commenting, and sharing."},
        {"name": "Explore", "description": "Test the discovery of new music styles, the randomization feature, and the creation of music using the selected style."},
    ]]
    sections_to_test = [TestSection.model_validate(_section) for _section in json.load(open("output/sections.json", "r"))]
    sections_to_test = await get_and_save_sections_to_test(website_url, website_documentation, headless=HEADLESS)

    await generate_and_save_section_guides(website_url, website_documentation, sections_to_test, headless=HEADLESS, concurrent=CONCURRENT)

    test_plans = json.load(open("output/test_plans.json", "r"))
    test_plans = await generate_and_save_test_plans(website_url, sections_to_test, headless=HEADLESS, concurrent=CONCURRENT)

    # TODO: save histories and use agent.rerun_history() to rerun tests when needed
    await generate_and_save_qa_results(test_plans, headless=HEADLESS, concurrent=CONCURRENT)
    upload_report_to_notion("output")
    create_jira_issues()


if __name__ == "__main__":
    asyncio.run(main())
