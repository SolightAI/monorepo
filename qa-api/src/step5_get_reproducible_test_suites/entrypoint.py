import os
import json

from step2_get_website_sections.agent import WebsiteSections, WebsiteSection
from logging import getLogger
from step4_get_test_plan.agent import TestPlan, TestPlanPerCategory, TestCategoryEnum
from step5_get_reproducible_test_suites.agent import make_test_suites_reproducible, ReproducibleTestPlan, TestPlanResult, TestSuiteResult, ReproducibleTestSuite
from prefect import flow


HEADLESS = bool(os.getenv("HEADLESS", "True"))


logger = getLogger(__name__)


def load_website_sections(output_folder: str = "output"):
    with open(f"{output_folder}/website_sections.json", "r") as f:
        return WebsiteSections.model_validate(json.load(f))


def load_reproducible_test_suites(output_folder: str = "output"):
    output = ReproducibleTestPlan(test_suites={})

    for section in load_website_sections(output_folder=output_folder).sections:
        output.test_suites[section.name] = TestPlanPerCategory(test_suites={})
        for test_category in TestCategoryEnum:
            with open(f"{output_folder}/{section.name}/reproducible/{test_category.name}.json", "r") as f:
                output.test_suites[section.name].test_suites[test_category] = ReproducibleTestSuite.model_validate(json.load(f))

    return output


def save_reproducible_test_suites(reproducible_test_suites: ReproducibleTestPlan, output_folder: str = "output"):
    for section, test_suites_per_category in reproducible_test_suites.test_suites.items():
        for test_category, test_suite in test_suites_per_category.test_suites.items():
            os.makedirs(f"{output_folder}/{section}/reproducible", exist_ok=True)
            with open(f"{output_folder}/{section}/reproducible/{test_category.name}.json", "w") as f:
                json.dump(test_suite.model_dump(), f, indent=4)


def load_test_suites_results(output_folder: str = "output"):
    output = TestPlanResult(test_suites={})

    for section in load_website_sections(output_folder=output_folder).sections:
        output.test_suites[section.name] = TestPlanPerCategory(test_suites={})
        for test_category in TestCategoryEnum:
            with open(f"{output_folder}/{section.name}/results/{test_category.name}.json", "r") as f:
                output.test_suites[section.name].test_suites[test_category] = TestSuiteResult.model_validate(json.load(f))

    return output


def save_test_suites_results(test_suites_results: TestPlanResult, output_folder: str = "output"):
    for section, test_suites_per_category in test_suites_results.test_suites.items():
        for test_category, test_suite_result in test_suites_per_category.test_suites.items():
            os.makedirs(f"{output_folder}/{section}/results", exist_ok=True)
            with open(f"{output_folder}/{section}/results/{test_category.name}.json", "w") as f:
                json.dump(test_suite_result.model_dump(), f, indent=4)


@flow(name="Get reproducible test suites", timeout_seconds=480)
async def step5_get_reproducible_test_suites(test_plan: TestPlan, output_folder: str):
    """Get reproducible test suites based on the test plan"""

    try:
        reproducible_test_suites = load_reproducible_test_suites(output_folder=output_folder)
        test_plan_result = load_test_suites_results(output_folder=output_folder)
        return reproducible_test_suites, test_plan_result
    except FileNotFoundError:
        pass


    reproducible_test_suites, test_plan_result = await make_test_suites_reproducible(
        test_plan=test_plan,
        headless=HEADLESS,
        gif_output_folder=os.path.join(output_folder, "gifs"),
    )

    save_reproducible_test_suites(reproducible_test_suites, output_folder=output_folder)
    save_test_suites_results(test_plan_result, output_folder=output_folder)

    return reproducible_test_suites, test_plan_result
