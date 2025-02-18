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

Note:
- While you're allowed to navigate inside the website/product, you're not allowed to navigate outside of it.
- You're not allowed to use any external tools or resources.
"""
# Dependencies: {dependencies} # FIXME: for now, we don't have dependencies


@retry(exceptions=Exception, tries=3, delay=1, backoff=2)
async def _run_qa_test(
    url: str,
    test_case: TestCase,
    headless: bool = False,
    gif_output_path: str | None = None,
):

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
        generate_gif=gif_output_path,
        controller=Controller(output_model=OutputTestResult),
    )

    try:
        history = await agent.run(max_steps=20)
    finally:
        await browser.close()

    return history


@retry(exceptions=Exception, tries=3, delay=1, backoff=2)
async def run_qa_tests(
    url: str,
    qa_tests: list[TestCase],
    headless: bool = False,
    gif_output_folder: str | None = None,
):

    if gif_output_folder:
        os.makedirs(os.path.join(gif_output_folder, "gifs"), exist_ok=True)

    coroutines = [_run_qa_test(
        url=url,
        test_case=test_case,
        headless=headless,
        gif_output_path=os.path.join(gif_output_folder, "gifs", f"{test_case.test_id}.gif") if gif_output_folder else None,
    ) for test_case in qa_tests]

    histories = await asyncio.gather(*coroutines)

    tests_output: list[OutputTestResult] = [

        OutputTestResult.model_validate_json(
            history.final_result()
        ) if history.has_errors() is False and history.is_done() is True

        else OutputTestResult(
            success=False,
            reason="Test failed" if history.has_errors() else "Reach max steps" if history.is_done() is False else "Unknown error"
        )

        for history in histories
    ]

    results = [TestResult(
        test_id=test_case.test_id,
        test_description=test_case.test_description,
        success=_result.success,
        reason=_result.reason
    ) for test_case, _result in zip(qa_tests, tests_output)]

    for _result in results:
        print(f"{_result.test_id}: {'✅ Success' if _result.success else '❌ Failed'} - {_result.reason}")

    return results
