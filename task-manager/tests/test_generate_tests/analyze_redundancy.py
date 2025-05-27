from logging import getLogger, INFO, StreamHandler
import json
import sys
from typing import List, Dict
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
from textwrap import dedent

# Configure logging
logger = getLogger(__name__)
logger.setLevel(INFO)
handler = StreamHandler(sys.stdout)
handler.setLevel(INFO)
logger.addHandler(handler)

def analyze_redundancy(tests: List[Dict]) -> Dict:
    """
    Analyze redundancy between test cases using GPT-4.1.
    Identifies similar test cases and provides recommendations for consolidation.
    
    Args:
        tests: List of test dictionaries containing test details
        
    Returns:
        Dictionary containing redundancy analysis results
    """
    # Initialize GPT-4.1
    llm = ChatOpenAI(model="gpt-4.1", temperature=0)
    
    # Create the system prompt
    system_prompt = dedent("""\
        You are an expert test redundancy analyzer. Your task is to analyze a set of test cases and identify potential redundancies.

        For each pair of tests, analyze:
        1. Test Steps: Compare the sequence and purpose of steps
        2. Test Assertions: Compare the verification points
        3. Test Coverage: Compare the overall test coverage and scenarios
        4. Test Data: Compare the data requirements and usage
        
        Consider the following when analyzing redundancy:
        - Tests that verify the same functionality
        - Tests that use similar steps but test different aspects
        - Tests that could be combined into a parameterized test
        - Tests that share common setup or teardown steps
        
        You must return a valid JSON object in the following format:
        {
            "test_pairs_analysis": [
                {
                    "test1": string,
                    "test2": string,
                    "redundancy_score": number,
                    "redundancy_type": string,
                    "similarity_details": {
                        "steps_similarity": number,
                        "assertions_similarity": number,
                        "coverage_similarity": number,
                        "data_similarity": number
                    },
                    "recommendation": string
                }
            ],
            "recommendations": [string]
        }
        
        Use the following th resholds for redundancy levels:
        - High redundancy: 90%+ similarity
        - Medium redundancy: 80-90% similarity
        - Low redundancy: 70-80% similarity
        
        Only include test pairs with 70%+ overall similarity in the analysis.
        Do not include any text before or after the JSON object.""")
    
    # Create the human prompt with test data
    test_data = json.dumps(tests, indent=2)
    human_prompt = dedent(f"""\
        Please analyze the following test cases for redundancy:

        {test_data}

        Focus on:
        1. Identifying test pairs with similar steps, assertions, or coverage
        2. Determining the level of redundancy between test pairs
        3. Providing specific recommendations for reducing redundancy
        4. Considering both explicit similarities and implicit relationships

        For each test pair, analyze:
        1. The similarity of test steps and their sequence
        2. The similarity of assertions and verification points
        3. The overlap in test coverage and scenarios
        4. The similarity in data requirements and usage

        Return the analysis in the specified JSON format. Do not include any text before or after the JSON object.""")
    
    # Get analysis from GPT-4
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_prompt)
    ]
    
    try:
        response = llm.invoke(messages)
        # Clean the response to ensure it's valid JSON
        content = response.content.strip()
        # Remove any markdown code block markers
        content = content.replace('```json', '').replace('```', '').strip()
        
        try:
            analysis = json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse GPT response as JSON: {str(e)}")
            logger.error(f"Raw response: {content}")
            raise ValueError("Invalid JSON response from GPT")
        
        # Ensure all required fields are present
        if not all(key in analysis for key in ["test_pairs_analysis", "recommendations"]):
            raise ValueError("Missing required fields in analysis")
            
        # Calculate redundancy summary manually
        test_pairs = analysis.get("test_pairs_analysis", [])
        high_pairs = sum(1 for pair in test_pairs if pair["redundancy_score"] >= 90)
        medium_pairs = sum(1 for pair in test_pairs if 80 <= pair["redundancy_score"] < 90)
        low_pairs = sum(1 for pair in test_pairs if 70 <= pair["redundancy_score"] < 80)
        
        # Calculate overall redundancy score as weighted average
        total_pairs = len(test_pairs)
        if total_pairs > 0:
            overall_score = (
                (high_pairs * 90 + medium_pairs * 85 + low_pairs * 75) /
                total_pairs
            )
        else:
            overall_score = 0
            
        # Add redundancy summary to analysis
        analysis["redundancy_summary"] = {
            "overall_redundancy_score": overall_score,
            "high_redundancy_pairs": high_pairs,
            "medium_redundancy_pairs": medium_pairs,
            "low_redundancy_pairs": low_pairs,
            "total_pairs_analyzed": total_pairs
        }
            
        return analysis
        
    except Exception as e:
        logger.error(f"Failed to analyze redundancy: {str(e)}")
        raise ValueError(f"Failed to analyze redundancy: {str(e)}")