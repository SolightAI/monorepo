import os
import json
import asyncio

from pydantic import SecretStr
from langchain_openai import AzureChatOpenAI
from browser_use import Agent, Browser, BrowserConfig, Controller
from dotenv import load_dotenv
from pydantic import BaseModel
# from lmnr import Laminar
from generate_qa_tests import TestCase
from retry import retry


load_dotenv()

# this line auto-instruments Browser Use and any browser you use (local or remote)
# Laminar.initialize() # you can also pass project api key here


AGENT_LLM = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT', ''),
    api_key=SecretStr(os.getenv('AZURE_OPENAI_KEY', '')),
    temperature=0.0,
)


class OutputTestResult(BaseModel):
    # test_id: str
    success: bool
    reason: str


class TestResult(OutputTestResult):
    test_id: str
    test_description: str


def test_results_to_markdown(test_results: list[TestResult]) -> str:
    return "\n".join([f"{result.test_id}: {'✅ Success' if result.success else '❌ Failed'} - {result.reason}" for result in test_results])


PROMPT_TEXT = """\
You are an experienced QA Test Engineer. Your task is to run the following test case and verify if it passes:

Description: {test_description}
Preconditions: {preconditions}
Test Steps: {test_steps}
Expected Results: {expected_results}
"""
# Dependencies: {dependencies} # FIXME: for now, we don't have dependencies


@retry(exceptions=Exception, tries=3, delay=1, backoff=2)
async def _run_qa_test(url: str, test_case: TestCase, headless: bool = False):

    browser = Browser(config=BrowserConfig(headless=headless))

    agent = Agent(
        browser=browser,
        task=PROMPT_TEXT.format(
            test_description=test_case.test_description,
            preconditions=test_case.preconditions,
            test_steps=test_case.test_steps,
            expected_results=test_case.expected_results,
            # dependencies=test_case.dependencies,
        ),
        llm=AGENT_LLM,
        initial_actions=[{'go_to_url': {'url': url}}],
        generate_gif=False,
        controller=Controller(output_model=OutputTestResult),
    )

    history = await agent.run(max_steps=20)

    await browser.close()

    return history


@retry(exceptions=Exception, tries=3, delay=1, backoff=2)
async def run_qa_tests(url: str, qa_tests: list[TestCase], headless: bool = False):

    coroutines = [_run_qa_test(url=url, test_case=test_case, headless=headless) for test_case in qa_tests]

    histories = await asyncio.gather(*coroutines)

    raw_results: list[str] = [history.final_result() for history in histories] # type: ignore

    parsed_results: list[OutputTestResult] = [OutputTestResult.model_validate_json(_raw_result) for _raw_result in raw_results]

    results_per_test = [TestResult(
        test_id=test_case.test_id,
        test_description=test_case.test_description,
        success=_result.success,
        reason=_result.reason
    # ) for test_case, _result in zip(qa_tests, parsed_results)]
    ) for test_case, _result in zip(qa_tests, parsed_results)]

    for result in results_per_test:
        print(f"{result.test_id}: {'✅ Success' if result.success else '❌ Failed'} - {result.reason}")

    return results_per_test
