import os

from pydantic import SecretStr, ValidationError
from logging import getLogger
from langchain_openai import AzureChatOpenAI
from browser_use import Agent, Browser, BrowserConfig, Controller
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from browser_use import AgentHistoryList
from step2_get_website_sections.agent import WebsiteSection
from step4_get_test_plan.agent import TestPlan, TestCategoryEnum, TestCaseSchema, TestSuiteSchema
from pydantic import BaseModel
from collections import defaultdict
from prefect import task, flow
from prefect.futures import wait


PROMPT = """\
You are an experienced QA Test Engineer. Your task is to run the following test case and verify if it passes:

Description: {test_description}
Test Steps: {test_steps}
Expected Results: {expected_results}

Note:
- While you're allowed to navigate inside the website/product, you're not allowed to navigate outside of it.
- You're not allowed to use any external tools or resources.
""".strip()

# Default timeout in seconds for test execution
DEFAULT_TEST_EXECUTION_TIMEOUT = int(os.getenv("TEST_EXECUTION_TIMEOUT", "240")) # 4 minutes by default

AGENT_LLM = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT', ''),
    api_key=SecretStr(os.getenv('AZURE_OPENAI_KEY', '')),
    temperature=0.0,
)


logger = getLogger(__name__)


class ReproducibleTestCase(TestCaseSchema): # one test case
    agent_history: AgentHistoryList


class ReproducibleTestSuite(BaseModel): # test cases for one category
    category: TestCategoryEnum  # type: ignore
    test_cases: list[ReproducibleTestCase]


class ReproducibleTestPlanPerCategory(BaseModel): # test cases for one section
    test_suites: dict[TestCategoryEnum, ReproducibleTestSuite] # type: ignore


class ReproducibleTestPlan(BaseModel): # test cases for all sections
    test_suites: dict[WebsiteSection, ReproducibleTestPlanPerCategory]


class _TestResultOutputModel(BaseModel): # output of one test case
    test_passed: bool
    reason: str


class TestResult(_TestResultOutputModel): # result of one test case
    test_case: ReproducibleTestCase
    internal_error: bool = False


class TestSuiteResult(BaseModel): # result of one category
    category: TestCategoryEnum # type: ignore
    results: list[TestResult]


class TestPlanPerCategoryResult(BaseModel): # result of one section
    test_suites: dict[TestCategoryEnum, TestSuiteResult] # type: ignore


class TestPlanResult(BaseModel): # result of all sections
    test_suites: dict[WebsiteSection, TestPlanPerCategoryResult]


# @task(timeout_seconds=300, retries=2, retry_delay_seconds=[1, 2, 4])
@task(timeout_seconds=420)
async def execute_test_steps(
    test_case: TestCaseSchema,
    headless: bool = False,
    gif_output_path: str | None = None,
) -> tuple[ReproducibleTestCase, TestResult]:
    """The actual implementation of test steps execution without timeout logic."""

    logger.info(f"Running test case {test_case.name}")

    logger.info(f"Creating browser")
    browser = Browser(
        config=BrowserConfig(
            headless=headless,
            chrome_instance_path=os.getenv("CHROME_INSTANCE_PATH", None)
        )
    )

    if gif_output_path is not None:
        os.makedirs(os.path.dirname(gif_output_path), exist_ok=True)

    logger.info(f"Creating browser context")
    context = BrowserContext(browser=browser, config=BrowserContextConfig(
        cookies_file=os.getenv("COOKIES_FILE", None),
        browser_window_size={
            'width': int(os.getenv('BROWSER_WINDOW_SIZE_WIDTH', "1920")),
            'height': int(os.getenv('BROWSER_WINDOW_SIZE_HEIGHT', "1080"))
        },
        locale=os.getenv('BROWSER_LOCALE', 'en-US'),
        user_agent=os.getenv('BROWSER_USER_AGENT', None),
        highlight_elements=True,
    ))

    logger.info(f"Creating agent")
    agent = Agent(
        browser_context=context,
        task=PROMPT.format(
            test_description=test_case.description,
            test_steps=test_case.steps,
            expected_results=test_case.expected_results,
        ),
        llm=AGENT_LLM,
        retry_delay=3,
        max_failures=2,
        initial_actions=[{'go_to_url': {'url': test_case.target_url}}],
        # generate_gif=gif_output_path,
        controller=Controller(output_model=_TestResultOutputModel),
    )

    logger.info(f"Running agent")
    try:
        history = await agent.run(max_steps=20)
    except Exception as e:
        logger.error(f"Error running test case {test_case.name}: {e}")
        raise e
    finally:
        logger.info(f"Closing browser context")
        await context.close()
        logger.info(f"Closing browser")
        await browser.close()

    logger.info(f"Reproducible test case created")
    reproducible_test_case = ReproducibleTestCase(**test_case.model_dump(), agent_history=history)

    if history.has_errors():
        logger.info(f"Test case has errors")
        return reproducible_test_case, TestResult(
            test_passed=False,
            reason="Internal error",
            internal_error=True,
            test_case=reproducible_test_case,
        )

    if history.is_done() is False:
        logger.info(f"Test case reached max steps")
        return reproducible_test_case, TestResult(
            test_passed=False,
            reason="Reach max steps",
            internal_error=True,
            test_case=reproducible_test_case,
        )

    logger.info(f"Validating test case result")
    try:
        _result = _TestResultOutputModel.model_validate_json(history.final_result())
    except ValidationError as e:
        logger.error(f"Error validating test case result for output {history.final_result()}")
        raise e

    logger.info(f"Test case result validated successfully")

    return reproducible_test_case, TestResult(
        test_passed=_result.test_passed,
        reason=_result.reason,
        internal_error=False,
        test_case=reproducible_test_case,
    )


@flow(name="Run test suite")
async def run_test_suite(
    test_suite: TestSuiteSchema,
    headless: bool = False,
    gif_output_folder: str | None = None,
) -> tuple[ReproducibleTestSuite, TestSuiteResult]:

    # We'll store each test's metadata and futures in data structures
    all_test_futures = []
    test_metadata_to_future_map = {}

    logger.info(f"Running test suite {test_suite.category.name}")

    # Create futures for all test cases
    logger.info("Creating futures for all test cases")
    for test_case in test_suite.test_cases:

        # Create output path for gif if needed
        gif_output_path = None
        if gif_output_folder:
            gif_output_path = os.path.join(
                gif_output_folder,
                test_suite.category.name.capitalize(),
                "results",
                f"{test_case.name}.gif"
            )

        # Submit the task using Prefect
        future = execute_test_steps.submit(
            test_case=test_case,
            headless=headless,
            gif_output_path=gif_output_path
        )

        # Store the future
        all_test_futures.append(future)
        test_metadata_to_future_map[test_case.name] = future

    # Wait for all futures to complete
    completed_futures = wait(all_test_futures)

    # If any tests failed with exceptions, log and raise
    for future in completed_futures.failed:
        logger.error(f"Test failed with exception: {future.exception()}")

    if completed_futures.failed:
        raise RuntimeError(f"Error running tests: {len(completed_futures.failed)} tests failed with exceptions")

    logger.info(f"All tests completed")

    # We need to organize the results back into categories by (section, category)
    logger.info("Organizing results back into categories")
    reproducible_test_suite = ReproducibleTestSuite(test_suites={})
    test_suite_results = TestSuiteResult(test_suites={})

    # Prepare data structures to hold test results
    logger.info("Preparing data structures to hold test results")
    category_test_cases_map = defaultdict(lambda: defaultdict(list))
    category_results_map = defaultdict(lambda: defaultdict(list))

    # Get results from all futures
    for test_case in test_suite.test_cases:
        future = test_metadata_to_future_map[test_case.name]
        reproducible_test_case, test_result = future.result()

        # Store results in our data structures
        category_test_cases_map[test_suite.category].append(reproducible_test_case)
        category_results_map[test_suite.category].append(test_result)

    # Build ReproducibleTestPlan and TestPlanResult from the organized results
    logger.info("Building ReproducibleTestPlan and TestPlanResult from the organized results")
    reproducible_test_suite = ReproducibleTestSuite(test_suites={})
    test_suite_results = TestSuiteResult(test_suites={})

    for category in test_suite.test_suites.keys():
        reproducible_test_suite.test_suites[category] = ReproducibleTestSuite(
            category=TestCategoryEnum[category.name],
            test_cases=category_test_cases_map[category],
        )
        test_suite_results.test_suites[category] = TestSuiteResult(
            category=TestCategoryEnum[category.name],
            results=category_results_map[category],
        )

    logger.info("Reproducible test suite and test suite results built successfully")

    return reproducible_test_suite, test_suite_results



# @flow
async def make_test_suites_reproducible(
    test_plan: TestPlan,
    headless: bool = False,
    gif_output_folder: str | None = None,
) -> tuple[ReproducibleTestPlan, TestPlanResult]:

    # We'll store each test's metadata and futures in data structures
    all_test_futures = []
    test_metadata_to_future_map = {}

    # Create futures for all test cases
    logger.info("Creating futures for all test cases")
    for section, test_suites_per_category in test_plan.test_suites.items():
        for category, test_suite in test_suites_per_category.test_suites.items():
            for test_case in test_suite.test_cases:
                # Create output path for gif if needed
                gif_output_path = None
                if gif_output_folder:
                    gif_output_path = os.path.join(
                        gif_output_folder,
                        section,
                        "gif",
                        category.name.capitalize(),
                        "results",
                        f"{test_case.name}.gif"
                    )

                # Submit the task using Prefect
                future = execute_test_steps.submit(
                    test_case=test_case,
                    headless=headless,
                    gif_output_path=gif_output_path
                )

                # Store the future
                all_test_futures.append(future)
                test_metadata_to_future_map[(section, category, test_case.name)] = future

    # Wait for all futures to complete
    completed_futures = wait(all_test_futures)

    for future in all_test_futures:
        try:
            future.result()
        except Exception as e:
            logger.error(f"Test failed with exception: {e}")

    # If you want to raise an exception if any test failed:
    if any(future.state.is_failed() for future in all_test_futures):
        raise Exception("One or more tests failed")


    # # If any tests failed with exceptions, log and raise
    # for future in completed_futures.failed:
    #     logger.error(f"Test failed with exception: {future.exception()}")

    # if completed_futures.failed:
    #     raise RuntimeError(f"Error running tests: {len(completed_futures.failed)} tests failed with exceptions")

    logger.info(f"All tests completed")

    # We need to organize the results back into categories by (section, category)
    logger.info("Organizing results back into categories")
    reproducible_test_plan = ReproducibleTestPlan(test_suites={})
    test_plan_results = TestPlanResult(test_suites={})

    # Prepare data structures to hold test results
    logger.info("Preparing data structures to hold test results")
    category_test_cases_map = defaultdict(lambda: defaultdict(list))
    category_results_map = defaultdict(lambda: defaultdict(list))

    # Get results from all futures
    for section, test_suites_per_category in test_plan.test_suites.items():
        for category, test_suite in test_suites_per_category.test_suites.items():
            for test_case in test_suite.test_cases:
                future = test_metadata_to_future_map[(section, category, test_case.name)]
                reproducible_test_case, test_result = future.result()

                # Store results in our data structures
                category_test_cases_map[section][category].append(reproducible_test_case)
                category_results_map[section][category].append(test_result)

    # Build ReproducibleTestPlan and TestPlanResult from the organized results
    logger.info("Building ReproducibleTestPlan and TestPlanResult from the organized results")
    for section, test_suites_per_category in test_plan.test_suites.items():
        reproducible_test_plan_per_category = ReproducibleTestPlanPerCategory(test_suites={})
        test_plan_per_category_results = TestPlanPerCategoryResult(test_suites={})

        for category in test_suites_per_category.test_suites.keys():
            reproducible_test_plan_per_category.test_suites[category] = ReproducibleTestSuite(
                category=TestCategoryEnum[category.name],
                test_cases=category_test_cases_map[section][category],
            )
            test_plan_per_category_results.test_suites[category] = TestSuiteResult(
                category=TestCategoryEnum[category.name],
                results=category_results_map[section][category],
            )

        reproducible_test_plan.test_suites[section] = reproducible_test_plan_per_category
        test_plan_results.test_suites[section] = test_plan_per_category_results

    logger.info("Reproducible test plan and test plan results built successfully")

    return reproducible_test_plan, test_plan_results
