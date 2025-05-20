from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
import json
from src.utils.dto import TestCategory
from logging import getLogger, INFO, StreamHandler
import sys
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage

# Configure logging
logger = getLogger(__name__)
logger.setLevel(INFO)
handler = StreamHandler(sys.stdout)
handler.setLevel(INFO)
logger.addHandler(handler)

class AlignmentLevel(Enum):
    YES = "Yes"
    PARTIAL = "Partial"
    NO = "No"

class Recommendation(Enum):
    KEEP = "Keep"
    IMPROVE = "Improve"
    DISCARD = "Discard"

@dataclass
class IntentAlignmentResult:
    alignment: AlignmentLevel
    relevance_score: float
    covers: List[str]
    missing: List[str]
    recommendation: Recommendation
    reasoning: str

def analyze_intent_alignment(
    test: Dict[str, Any],
    user_request: str,
    category: Optional[str] = None
) -> IntentAlignmentResult:
    """
    Analyze the alignment between a generated test and the user's intent using GPT-4.
    
    Args:
        test: The generated test case
        user_request: The original user request for test generation
        category: Optional test category that was requested
        
    Returns:
        IntentAlignmentResult containing the analysis
    """
    # Initialize GPT-4
    llm = ChatOpenAI(model="gpt-4", temperature=0)
    
    # Create the system prompt
    system_prompt = """You are a senior QA analyst specializing in test intent analysis. Your task is to evaluate if a generated test case accurately reflects the user's intent.

    For each test, analyze:
    1. Test Name: Does it clearly indicate the test's purpose?
    2. Test Description: Does it align with the user's request?
    3. Test Steps: Do they cover the intended functionality?
    4. Test Assertions: Do they verify the right outcomes?
    
    Consider the following when analyzing alignment:
    - Whether the test matches the intent behind the request
    - What key concepts from the request are covered
    - What is missing or off-target
    - Whether the test should be kept, improved, or discarded
    
    Important Guidelines:
    1. Widget-specific tests are valid and should be evaluated based on their individual merit
    2. A test that focuses on one widget is acceptable if it's well-structured and tests important scenarios
    3. Consider the test's depth and quality rather than just its scope
    4. Tests with clear steps and assertions should be preferred over broad but vague tests
    5. If a test needs improvement, it should still get a reasonable score based on its potential
    6. Only completely unreadable or invalid tests should get a score of 0
    7. If test steps or assertions are broken into individual characters but the test name and description are clear:
       - Score based on the test's intent and structure
       - Consider the test name and description as indicators of the test's purpose
       - Do not penalize heavily for broken steps/assertions if the overall intent is clear
    8. For tests with broken content:
       - If test name and description are clear: minimum score of 0.4
       - If test name is clear but description is broken: minimum score of 0.3
       - If test name is broken: minimum score of 0.2
    
    You must return a valid JSON object in the following format:
    {
        "alignment": "Yes" | "Partial" | "No",
        "relevance_score": number (0.0 to 1.0),
        "covers": [string],
        "missing": [string],
        "recommendation": "Keep" | "Improve" | "Discard",
        "reasoning": string
    }
    
    Use the following guidelines for alignment levels:
    - Yes: Test fully matches user intent (60%+ alignment)
    - Partial: Test partially matches user intent (30-60% alignment)
    - No: Test does not match user intent (<30% alignment)
    
    Scoring Guidelines:
    - Well-structured widget-specific test: 0.8-1.0
    - Test with minor issues (needs improvement): 0.6-0.8
    - Test with major issues but has potential: 0.4-0.6
    - Test with significant issues but shows intent: 0.2-0.4
    - Completely unreadable or invalid test: 0.0-0.2
    
    When a test needs improvement:
    - If it has clear purpose but needs better steps: score 0.6-0.7
    - If it has good steps but needs better assertions: score 0.5-0.6
    - If it has good structure but needs more coverage: score 0.4-0.5
    - If it's readable but needs significant work: score 0.2-0.4
    
    Special Cases for Broken Content:
    - Clear test name and description but broken steps/assertions: 0.4-0.6
    - Clear test name but broken description and steps/assertions: 0.3-0.5
    - Broken test name but clear intent from description: 0.2-0.4
    
    Do not include any text before or after the JSON object."""
    
    # Extract test components
    test_name = test.get('name', '')
    test_description = test.get('description', '')
    test_steps = test.get('steps', [])
    test_assertions = test.get('assertions', [])
    test_category = test.get('category', '')
    
    # Create the human prompt
    human_prompt = f"""Please analyze the alignment between this test case and the user's request:

User Request:
"{user_request}"

Test:
Name: "{test_name}"
Description: "{test_description}"
Category: "{test_category}"
Steps:
{chr(10).join(f"{i+1}. {step}" for i, step in enumerate(test_steps))}
Assertions:
{chr(10).join(f"{i+1}. {assertion}" for i, assertion in enumerate(test_assertions))}

Focus on:
1. Whether the test accurately reflects the user's intent
2. What key aspects of the request are covered
3. What important aspects are missing
4. Whether the test should be kept, improved, or discarded

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
        required_fields = ["alignment", "relevance_score", "covers", "missing", "recommendation", "reasoning"]
        if not all(field in analysis for field in required_fields):
            raise ValueError("Missing required fields in analysis")
        
        # Convert string values to enums
        try:
            alignment = AlignmentLevel(analysis["alignment"])
            recommendation = Recommendation(analysis["recommendation"])
        except ValueError as e:
            logger.error(f"Invalid enum value in analysis: {str(e)}")
            raise ValueError("Invalid alignment or recommendation value")
        
        return IntentAlignmentResult(
            alignment=alignment,
            relevance_score=float(analysis["relevance_score"]),
            covers=analysis["covers"],
            missing=analysis["missing"],
            recommendation=recommendation,
            reasoning=analysis["reasoning"]
        )
        
    except Exception as e:
        logger.error(f"Failed to analyze intent alignment: {str(e)}")
        
        # Return default analysis with error message
        return IntentAlignmentResult(
            alignment=AlignmentLevel.PARTIAL,
            relevance_score=0.5,
            covers=["test functionality"],
            missing=["intent alignment analysis failed"],
            recommendation=Recommendation.IMPROVE,
            reasoning=f"Failed to analyze intent alignment: {str(e)}"
        )

def analyze_intent_alignment_batch(
    tests: List[Dict[str, Any]],
    user_request: str,
    category: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyze intent alignment for a batch of generated tests.
    
    Args:
        tests: List of generated test cases
        user_request: The original user request for test generation
        category: Optional test category that was requested
        
    Returns:
        Dictionary containing batch analysis results
    """
    results = []
    total_score = 0.0
    keep_count = 0
    improve_count = 0
    discard_count = 0
    
    for test in tests:
        analysis = analyze_intent_alignment(test, user_request, category)
        results.append({
            "test_name": test.get('name', ''),
            "alignment": analysis.alignment.value,
            "relevance_score": analysis.relevance_score,
            "covers": analysis.covers,
            "missing": analysis.missing,
            "recommendation": analysis.recommendation.value,
            "reasoning": analysis.reasoning
        })
        
        total_score += analysis.relevance_score
        
        if analysis.recommendation == Recommendation.KEEP:
            keep_count += 1
        elif analysis.recommendation == Recommendation.IMPROVE:
            improve_count += 1
        else:
            discard_count += 1
    
    total_tests = len(tests)
    average_score = total_score / total_tests if total_tests > 0 else 0
    
    return {
        "intent_alignment_summary": {
            "total_tests": total_tests,
            "average_relevance_score": average_score,
            "keep_count": keep_count,
            "improve_count": improve_count,
            "discard_count": discard_count,
            "keep_percentage": (keep_count / total_tests * 100) if total_tests > 0 else 0
        },
        "test_analysis": results,
        "recommendations": [
            f"Keep {keep_count} tests that align well with user intent",
            f"Improve {improve_count} tests to better match user requirements",
            f"Discard {discard_count} tests that don't align with user intent"
        ]
    } 