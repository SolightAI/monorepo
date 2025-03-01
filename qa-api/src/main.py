import asyncio

from step1_get_website_documentation.entrypoint import step1_get_website_documentation
from step2_get_website_sections.entrypoint import step2_get_website_sections
from step3_get_documented_sections.entrypoint import step3_get_documented_sections
from step4_get_test_plan.entrypoint import step4_get_test_plan
from step5_get_reproducible_test_suites.entrypoint import step5_get_reproducible_test_suites


async def main():
    documentation = await step1_get_website_documentation("https://qacrmdemo.netlify.app", "outputs")
    sections = await step2_get_website_sections("https://qacrmdemo.netlify.app", documentation, "outputs")
    documented_sections = await step3_get_documented_sections("https://qacrmdemo.netlify.app", documentation, sections, "outputs")
    test_plan = await step4_get_test_plan("https://qacrmdemo.netlify.app", documented_sections, "outputs")
    reproducible_test_suites, test_plan_result = await step5_get_reproducible_test_suites(test_plan, "outputs")
    print(f"{test_plan_result=}")


if __name__ == "__main__":
    asyncio.run(main())
