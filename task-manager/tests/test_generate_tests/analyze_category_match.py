from logging import getLogger, INFO, StreamHandler
import json
import sys
from typing import List, Dict
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage

# Configure logging
logger = getLogger(__name__)
logger.setLevel(INFO)
handler = StreamHandler(sys.stdout)
handler.setLevel(INFO)
logger.addHandler(handler)

# Category descriptions
TEST_CATEGORIES_DESCRIPTION = {
    "smoke": "aka (Happy path): testing the functionality of a feature, making sure it works as expected.",
    "negative": "aka (Unhappy path): testing scenarios where the user is suppposed to encounter errors, making sure the feature behaves as expected with invalid data, inputs or actions."
}

def analyze_category_match(tests: List[Dict], requested_category: str) -> Dict:
    """
    Analyze if the generated tests match the requested category using GPT-4.
    
    Args:
        tests: List of test dictionaries containing test details
        requested_category: The category that was requested (e.g., "smoke", "negative")
        
    Returns:
        Dictionary containing category match analysis results
    """
    # Initialize GPT-4
    llm = ChatOpenAI(model="gpt-4", temperature=0)
    
    # Get category description
    category_description = TEST_CATEGORIES_DESCRIPTION.get(requested_category.lower(), "")
    
    # Create the system prompt
    system_prompt = f"""You are an expert test category analyzer. Your task is to analyze if the generated test cases match the requested category: {requested_category}.

    Category Description:
    {category_description}
    
    For each test, analyze:
    1. Test Category: The category assigned to the test
    2. Test Content: The actual content of the test (steps, assertions, etc.)
    3. Category Match: Whether the test content aligns with the requested category
    
    For Smoke Tests (Happy Path):
    - Focus on basic functionality verification
    - Test normal user flows
    - Verify expected behavior with valid inputs
    - Ensure critical features work as intended
    
    For Negative Tests (Unhappy Path):
    - Focus on error handling and edge cases
    - Test invalid inputs and error conditions
    - Verify proper error messages and handling
    - Ensure system behaves correctly with unexpected inputs
    
    Return the analysis in the following JSON format:
    {{
        "total_tests": number,
        "requested_category": string,
        "category_match_summary": {{
            "matching_tests": number,
            "non_matching_tests": number,
            "match_percentage": number
        }},
        "test_analysis": [
            {{
                "test_name": string,
                "assigned_category": string,
                "matches_requested": boolean,
                "confidence_score": number,
                "reasoning": string,
                "suggested_category": string,
                "improvement_suggestions": string
            }}
        ],
        "recommendations": [
            string
        ]
    }}
    
    Be thorough in analyzing each test's content and category alignment."""
    
    # Create the human prompt with test data
    test_data = json.dumps(tests, indent=2)
    human_prompt = f"""Please analyze if the following test cases match the requested category '{requested_category}':

{test_data}

Focus on:
1. Whether each test's content aligns with the requested category
2. The confidence level of the category match
3. Specific reasons why a test may or may not match the category
4. If a test doesn't match, suggest the correct category
5. Provide specific suggestions for improving test alignment with the requested category

Return the analysis in the specified JSON format."""
    
    # Get analysis from GPT-4
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_prompt)
    ]
    
    try:
        response = llm.invoke(messages)
        analysis = json.loads(response.content)
        
        # Ensure all required fields are present
        if not all(key in analysis for key in ["total_tests", "requested_category", "category_match_summary", "test_analysis"]):
            raise ValueError("Missing required fields in analysis")
            
        return analysis
        
    except Exception as e:
        logger.error(f"Failed to analyze category match: {str(e)}")
        
        # Provide a default analysis based on test categories
        matching_tests = sum(1 for test in tests if test.get('category', '').lower() == requested_category.lower())
        total_tests = len(tests)
        match_percentage = (matching_tests / total_tests * 100) if total_tests > 0 else 0
        
        return {
            "total_tests": total_tests,
            "requested_category": requested_category,
            "category_match_summary": {
                "matching_tests": matching_tests,
                "non_matching_tests": total_tests - matching_tests,
                "match_percentage": match_percentage
            },
            "test_analysis": [
                {
                    "test_name": test.get('name', ''),
                    "assigned_category": test.get('category', ''),
                    "matches_requested": test.get('category', '').lower() == requested_category.lower(),
                    "confidence_score": 1.0 if test.get('category', '').lower() == requested_category.lower() else 0.0,
                    "reasoning": "Category matches requested category" if test.get('category', '').lower() == requested_category.lower() else "Category does not match requested category",
                    "suggested_category": test.get('category', ''),
                    "improvement_suggestions": "No improvements needed" if test.get('category', '').lower() == requested_category.lower() else "Consider updating test category to match requested category"
                }
                for test in tests
            ],
            "recommendations": [
                "Ensure all tests are properly categorized",
                "Review test content to ensure it aligns with the requested category"
            ]
        }

