from src.generation.test_generation import generate_tests
from src.utils.dto import Product, Epic, Feature, TestCategory
from src.test_run.test_endpoint import run_test
from logging import getLogger, INFO, StreamHandler
import pytest
import sys
import json

# Configure logging
logger = getLogger(__name__)
logger.setLevel(INFO)
handler = StreamHandler(sys.stdout)
handler.setLevel(INFO)
logger.addHandler(handler)


@pytest.mark.asyncio
async def test_generate_tests():
    # Create test data
    product = Product(
        name="Test Product",
        url="https://farmzz.com",
        description="A test product",
        documentation="https://farmzz.com",
        links_to_documentation=["https://farmzz.com"]
    )
    
    epic = Epic(
        name="Test Epic",
        description="A test epic"
    )
    
    feature = Feature(
        id="test-feature-123",
        name="Test Feature",
        description="A test feature",
        urls=["https://farmzz.com/"]
    )
    
    # Context with job ID
    ctx = {
        "job_id": "test-job-123"
    }
    
    # Generate tests
    result = await generate_tests(
        ctx=ctx,
        product=product.model_dump(),
        epic=epic.model_dump(),
        feature=feature.model_dump(),
        categories=[TestCategory.SMOKE.value]  # Generate smoke tests
    )
    
    # Store generated tests
    generated_tests = result["results"]
    
    # Log the generated tests
    print("\n=== Generated Tests ===")
    for idx, test in enumerate(generated_tests, 1):
        print(f"\nTest #{idx}:")
        print(f"Name: {test['name']}")
        print(f"Description: {test['description']}")
        print(f"Category: {test['category']}")
        print(f"Preconditions: {test['preconditions']}")
        print(f"Steps: {test['steps']}")
        print(f"Assertions: {test['assertions']}")
    
    # Assert that tests were generated
    assert result["status"] == "passed"
    assert len(generated_tests) > 0
    
    # Run each generated test
    print("\n=== Running Generated Tests ===")
    test_results = []
    for idx, test in enumerate(generated_tests, 1):
        print(f"\nRunning Test #{idx}: {test['name']}")
        try:
            test_result = await run_test(
                ctx=ctx,
                product=product.model_dump(),
                feature=feature.model_dump(),
                test=test,
                run_without_cache=True
            )
            test_results.append(test_result)
            print(f"Status: {test_result['status']}")
            if test_result.get('results'):
                print(f"Results: {test_result['results']}")
            if test_result.get('error'):
                print(f"Error: {test_result['error']}")
        except Exception as e:
            error_result = {
                "status": "error",
                "error": str(e),
                "test_name": test['name']
            }
            test_results.append(error_result)
            print(f"Error running test: {str(e)}")
    
    # Log final test results
    print("\n=== Final Test Results ===")
    for idx, result in enumerate(test_results, 1):
        print(f"\nTest #{idx} Result:")
        print(f"Status: {result['status']}")
        if result.get('results'):
            print(f"Results: {result['results']}")
        if result.get('error'):
            print(f"Error: {result['error']}")
    
    # Log detailed test statistics
    total_tests = len(test_results)
    passed_tests = sum(1 for r in test_results if r["status"] == "passed")
    failed_tests = sum(1 for r in test_results if r["status"] == "failed")
    error_tests = sum(1 for r in test_results if r["status"] == "error")
    
    print("\n=== Test Statistics ===")
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {failed_tests}")
    print(f"Errors: {error_tests}")
    
    # Assert that at least some tests completed successfully
    assert passed_tests > 0, "No tests passed successfully"
    assert error_tests < total_tests, "All tests resulted in errors"



