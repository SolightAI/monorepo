from logging import getLogger, INFO, StreamHandler
import json
import sys
from typing import List, Dict
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
from src.utils.dto import TEST_CATEGORIES_DESCRIPTION
from textwrap import dedent

# Configure logging
logger = getLogger(__name__)
logger.setLevel(INFO)
handler = StreamHandler(sys.stdout)
handler.setLevel(INFO)
logger.addHandler(handler)

def analyze_category_match(tests: List[Dict], requested_category: str) -> Dict:
    """
    Analyze if the generated tests match the requested category using GPT-4.1.
    
    Args:
        tests: List of test dictionaries containing test details
        requested_category: The category that was requested (e.g., "smoke", "negative")
        
    Returns:
        Dictionary containing category match analysis results
    """
    # Initialize GPT-4.1
    llm = ChatOpenAI(model="gpt-4.1", temperature=0)
    
    # Get category description
    category_description = TEST_CATEGORIES_DESCRIPTION.get(requested_category.lower(), "")
    
    # Create the system prompt
    system_prompt = dedent(f"""\
        You are an expert test category analyzer. Your task is to analyze if the generated test cases match the requested category: {requested_category}.
        
        For each test, analyze:
        1. Test Category: The category assigned to the test
        2. Test Content: The actual content of the test (steps, assertions, etc.)
        3. Category Match: Whether the test content aligns with the requested category
        
        Follow {category_description} to analyze the test content.
        
        Return the analysis in the following JSON format:
        {{
            "test_analysis": [
                {{
                    "test_name": string,
                    "reasoning": string,
                    "assigned_category": string,
                    "matches_requested": boolean,
                    "confidence_score": number,
                    "suggested_category": string,
                    "improvement_suggestions": string
                }}
            ],
            "recommendations": [
                string
            ]
        }}
        
        Be thorough in analyzing each test's content and category alignment.""")
    
    # Create the human prompt with test data
    test_data = json.dumps(tests, indent=2)
    human_prompt = dedent(f"""\
        Please analyze if the following test cases match the requested category '{requested_category}':

        {test_data}

        Focus on:
        1. Whether each test's content aligns with the requested category
        2. The confidence level of the category match
        3. Specific reasons why a test may or may not match the category
        4. If a test doesn't match, suggest the correct category
        5. Provide specific suggestions for improving test alignment with the requested category

        Return the analysis in the specified JSON format.""")
    
    # Get analysis from GPT-4
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_prompt)
    ]
    
    try:
        response = llm.invoke(messages)
        analysis = json.loads(response.content)
        
        # Calculate basic metrics manually
        # For multiple categories, a test matches if it belongs to any of the requested categories
        requested_categories = [cat.strip().lower() for cat in requested_category.split(',')]
        matching_tests = [
            test for test in tests 
            if test.get('category', '').lower() in requested_categories
        ]
        total_tests = len(tests)
        
        # Merge manual metrics with GPT analysis
        analysis.update({
            "total_tests": total_tests,
            "requested_category": requested_category,
            "category_match_summary": {
                "matching_tests": len(matching_tests),
                "non_matching_tests": total_tests - len(matching_tests),
                "match_percentage": (len(matching_tests) * 100 / total_tests) if total_tests > 0 else 0
            }
        })
            
        return analysis
        
    except Exception as e:
        logger.error(f"Failed to analyze category match: {str(e)}")
        raise ValueError(f"Failed to analyze category match: {str(e)}")

