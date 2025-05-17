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

def analyze_redundancy(tests: List[Dict]) -> Dict:
    """
    Analyze redundancy between test cases using GPT-4.
    Identifies similar test cases and provides recommendations for consolidation.
    
    Args:
        tests: List of test dictionaries containing test details
        
    Returns:
        Dictionary containing redundancy analysis results
    """
    # Initialize GPT-4
    llm = ChatOpenAI(model="gpt-4", temperature=0)
    
    # Create the system prompt
    system_prompt = """You are an expert test redundancy analyzer. Your task is to analyze a set of test cases and identify potential redundancies.

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
        "redundancy_summary": {
            "overall_redundancy_score": number,
            "high_redundancy_pairs": number,
            "medium_redundancy_pairs": number,
            "low_redundancy_pairs": number
        },
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
    
    Use the following thresholds for redundancy levels:
    - High redundancy: 90%+ similarity
    - Medium redundancy: 80-90% similarity
    - Low redundancy: 70-80% similarity
    
    Only include test pairs with 70%+ overall similarity in the analysis.
    Do not include any text before or after the JSON object."""
    
    # Create the human prompt with test data
    test_data = json.dumps(tests, indent=2)
    human_prompt = f"""Please analyze the following test cases for redundancy:

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

Return the analysis in the specified JSON format. Do not include any text before or after the JSON object."""
    
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
        if not all(key in analysis for key in ["redundancy_summary", "test_pairs_analysis", "recommendations"]):
            raise ValueError("Missing required fields in analysis")
            
        # Ensure redundancy summary has all required fields
        if not all(key in analysis["redundancy_summary"] for key in [
            "overall_redundancy_score", "high_redundancy_pairs",
            "medium_redundancy_pairs", "low_redundancy_pairs"
        ]):
            # Calculate redundancy summary from test pairs analysis
            high_pairs = sum(1 for pair in analysis["test_pairs_analysis"] if pair["redundancy_score"] >= 90)
            medium_pairs = sum(1 for pair in analysis["test_pairs_analysis"] if 80 <= pair["redundancy_score"] < 90)
            low_pairs = sum(1 for pair in analysis["test_pairs_analysis"] if 70 <= pair["redundancy_score"] < 80)
            
            # Calculate overall redundancy score as weighted average
            total_pairs = len(analysis["test_pairs_analysis"])
            if total_pairs > 0:
                overall_score = (
                    (high_pairs * 90 + medium_pairs * 85 + low_pairs * 75) /
                    total_pairs
                )
            else:
                overall_score = 0
                
            analysis["redundancy_summary"] = {
                "overall_redundancy_score": overall_score,
                "high_redundancy_pairs": high_pairs,
                "medium_redundancy_pairs": medium_pairs,
                "low_redundancy_pairs": low_pairs
            }
            
        return analysis
        
    except Exception as e:
        logger.error(f"Failed to analyze redundancy: {str(e)}")
        
        # Return empty analysis with error message
        return {
            "redundancy_summary": {
                "overall_redundancy_score": 0,
                "high_redundancy_pairs": 0,
                "medium_redundancy_pairs": 0,
                "low_redundancy_pairs": 0
            },
            "test_pairs_analysis": [],
            "recommendations": [
                "Failed to analyze redundancy using GPT",
                "Please try again or check the test cases manually"
            ]
        }

def calculate_text_similarity(text1: str, text2: str) -> float:
    """
    Calculate similarity between two text strings.
    Uses a simple word overlap approach.
    
    Args:
        text1: First text string
        text2: Second text string
        
    Returns:
        Similarity score between 0 and 1
    """
    # Convert to sets of words
    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())
    
    # Calculate Jaccard similarity
    intersection = len(words1.intersection(words2))
    union = len(words1.union(words2))
    
    return intersection / union if union > 0 else 0 