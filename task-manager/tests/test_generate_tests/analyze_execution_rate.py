from logging import getLogger, INFO, StreamHandler
import sys
from typing import List, Dict
from src.utils.dto import TestStatus

# Configure logging
logger = getLogger(__name__)
logger.setLevel(INFO)
handler = StreamHandler(sys.stdout)
handler.setLevel(INFO)
logger.addHandler(handler)

def analyze_execution_rate(test_results: List[Dict]) -> Dict:
    """
    Analyze execution rate of test results.
    Counts all tests, with passed and failed as successful executions,
    and all other statuses as other.
    
    Args:
        test_results: List of test result dictionaries containing test execution details
        
    Returns:
        Dictionary containing execution rate analysis results
    """
    # Count all tests
    total_tests = len(test_results)
    passed_tests = sum(1 for r in test_results if r.get("status") == TestStatus.PASSED.value)
    failed_tests = sum(1 for r in test_results if r.get("status") == TestStatus.FAILED.value)
    other_tests = sum(1 for r in test_results if r.get("status") not in [TestStatus.PASSED.value, TestStatus.FAILED.value])
    
    # Calculate success rate - both passed and failed count as successful executions
    success_rate = ((passed_tests + failed_tests) / total_tests * 100) if total_tests > 0 else 0
    
    return {
        "execution_summary": {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "other_tests": other_tests,
            "success_rate": success_rate
        }
    }
