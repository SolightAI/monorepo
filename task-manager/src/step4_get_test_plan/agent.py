import os

from enum import Enum
from pydantic import SecretStr, BaseModel
from logging import getLogger
from langchain_openai import AzureChatOpenAI
from browser_use import Agent, Browser, BrowserConfig, Controller
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from step2_get_website_sections.agent import WebsiteSections, WebsiteSection
from prefect import task, flow
from prefect.logging import get_run_logger
from prefect.futures import wait


PROMPT = """\
You are an experienced QA Test Engineer. Your task is to create a comprehensive test suite for the provided section based on the provided feature guide.

Section to test: {section_name}
Description: {section_description}

Please generate a structured test plan for the following test category:
{test_category_name}: {test_category_description}

Make sure to cover all the test cases for the provided test category ({test_category_name}).

To help you generate the test cases, here is the feature guide:
{section_documentation}

Additional requirements:
- Use clear, actionable language
- Don't make any assumption, verify by yourself
- When verifying data-related features, make sure to verify that the data is actually saved and persisted in the database by reloading the page (specify it in the steps of the test case).
- Before writing the test cases for a feature, make sure to verify that the feature actually exists in the UI.
- Write as many test cases as needed for the provided test category.
""".strip()


AGENT_LLM = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT', ''),
    api_key=SecretStr(os.getenv('AZURE_OPENAI_KEY', '')),
    temperature=0.00000001,
)


class Severity(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"
    LOWEST = "Lowest"


class TestCategory(Enum):
    POSITIVE = {
        "name": "Positive",
        "description": "Positive test cases (happy path). Scenarios that verify the system works as expected under normal or ideal conditions. These tests ensure that the software behaves correctly when given valid and expected inputs."
    }
    NEGATIVE = {
        "name": "Negative",
        "description": "Negative test cases (error handling). Focus on only testing the system when given incorrect inputs or unexpected user actions. External factors should not be considered nor tested (e.g no internet connection, no database connection, etc.). Do NOT simulate scenarios, just test the system when given incorrect inputs or unexpected user actions. Do not modify the DOM of the page, just test the system when given incorrect inputs or unexpected user actions."
    }
    INTEGRATION = {
        "name": "Integration",
        "description": "Integration test cases (cross-feature interactions). Focus on testing the interaction between different part of the product to ensure they work together as expected. Verify data flow and communication between dependent systems to detect integration issues. Do NOT simulate scenarios, just test the interaction between different part of the product to ensure they work together as expected. . Do not modify the DOM of the page, just test the system when given incorrect inputs or unexpected user actions.",
    }


TestCategoryEnum = Enum('TestCategoryEnum', {
    _category.name: _category.value["name"]
    for _category in TestCategory
}, type=str)


class TestCaseSchema(BaseModel):
    name: str
    severity: Severity
    category: TestCategoryEnum # type: ignore
    target_url: str
    steps: list[str]
    description: str
    expected_results: str
    # preconditions: str


class TestSuiteSchema(BaseModel):
    category: TestCategoryEnum # type: ignore
    test_cases: list[TestCaseSchema]


class TestPlanPerCategory(BaseModel):
    test_suites: dict[TestCategoryEnum, TestSuiteSchema] # type: ignore


class TestPlan(BaseModel):
    test_suites: dict[str, TestPlanPerCategory]



@task(timeout_seconds=300, retries=2, retry_delay_seconds=[1, 2, 4])
async def generate_test_suite(
    website_url: str,
    section: WebsiteSection,
    test_category_name: str,
    headless: bool = True,
    gif_output_folder: str | None = None,
) -> TestSuiteSchema:

    logger = get_run_logger()
    logger.info(f"Generating test suite for section \"{section.name}\" and category \"{test_category_name}\"")

    test_category = next(cat for cat in TestCategory if cat.value["name"] == test_category_name)

    logger.info(f"Creating browser and browser config.")
    browser = Browser(
        config=BrowserConfig(
            headless=headless,
            chrome_instance_path=os.getenv("CHROME_INSTANCE_PATH", None)
        )
    )

    logger.info(f"Creating browser context.")
    context = BrowserContext(browser=browser, config=BrowserContextConfig(
        cookies_file=os.getenv("COOKIES_FILE", None),
    ))

    if gif_output_folder:
        gif_output_folder_path = os.path.join(gif_output_folder, section.name, "gif", test_category.value["name"])
        os.makedirs(gif_output_folder_path, exist_ok=True)

    logger.info(f"Creating agent.")
    agent = Agent(
        task=PROMPT.format(
            test_category_name=test_category.value["name"],
            test_category_description=test_category.value["description"],
            section_documentation=section.documentation,
            section_name=section.name,
            section_description=section.description,
        ),
        llm=AGENT_LLM,
        initial_actions=[{'go_to_url': {'url': website_url}}],
        controller=Controller(output_model=TestSuiteSchema),
        browser_context=context,
        # generate_gif=os.path.join(
        #     gif_output_folder_path,
        #     "test_suite_generation.gif"
        # ) if gif_output_folder else None, # NOTE: deactivate for now (random font issue)
    )

    logger.info(f"Running agent.")
    try:
        history = await agent.run(max_steps=int(os.getenv("TEST_GENERATION_MAX_STEPS", "30")))
    except Exception as e:
        logger.error(f"Error running agent: {e}")
        raise e
    finally:
        logger.info(f"Closing browser context.")
        await context.close()
        logger.info(f"Closing browser.")
        await browser.close()

    if history.final_result() is None or not history.is_done():
        logger.error(f"Failed to generate test cases for section \"{section.name}\" and category \"{test_category.value['name']}\"")
        logger.debug(f"History used to generate test cases ({section.name=} {test_category.value['name']=}): {history}")
        raise Exception("Failed to generate test cases")

    logger.info(f"Test suite generated successfully.")
    test_suite = TestSuiteSchema.model_validate_json(history.final_result())
    logger.info(f"Generated {len(test_suite.test_cases)} tests in {len(history.action_names())} steps")
    return test_suite


# @flow
async def generate_test_plan(
    website_url: str,
    sections: WebsiteSections,
    headless: bool = True,
    gif_output_folder: str | None = None,
) -> TestPlan:
    """
    Orchestrates the generation of test suites for all sections and categories.
    Returns a complete test plan.
    """

    test_plan = TestPlan(test_suites={})

    # Create a list to store all the futures from generate_test_suite calls
    test_suite_futures = []

    # Create a mapping to store the section, category to future mapping
    section_category_map = {}

    # Launch all test suite generation tasks in parallel
    for section in sections.sections:
        test_plan.test_suites[section.name] = TestPlanPerCategory(test_suites={})
        for category in TestCategory:
            future = generate_test_suite.submit(
                website_url=website_url,
                section=section,
                test_category_name=category.value["name"],
                headless=headless,
                gif_output_folder=gif_output_folder
            )
            test_suite_futures.append(future)
            section_category_map[(section.name, category.value["name"])] = future

    # Wait for all futures to complete at once
    completed_futures = wait(test_suite_futures)

    # Organize the results into the test plan structure
    for section in sections.sections:
        test_plan_per_category = TestPlanPerCategory(test_suites={})
        for category in TestCategory:
            future = section_category_map[(section.name, category.value["name"])]
            # No need to wait again, we already waited for all futures
            test_suite = future.result()
            test_plan_per_category.test_suites[category.value["name"]] = test_suite
        test_plan.test_suites[section.name] = test_plan_per_category

    return test_plan
