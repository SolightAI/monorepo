from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
import json
from logging import getLogger, INFO, StreamHandler
import sys
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
from textwrap import dedent

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
    feature_name: str,
    feature_description: str,
    category: Optional[str] = None
) -> IntentAlignmentResult:
    """
    Analyze if a generated test properly covers the feature scope using GPT-4.1.
    
    Args:
        test: The generated test case
        feature_name: Name of the feature being tested
        feature_description: Description of the feature being tested
        category: Optional test category that was requested
        
    Returns:
        IntentAlignmentResult containing the analysis
    """
    # Initialize GPT-4.1
    llm = ChatOpenAI(model="gpt-4.1", temperature=0)
    
    # Create the system prompt
    system_prompt = dedent(f"""\
        You are an expert test scope analyzer. Your task is to analyze if the generated test cases properly cover the specific feature: {feature_name}.

        Feature Description:
        {feature_description}
        
        For each test, analyze:
        1. Test Scope: Whether the test is within the feature's boundaries
        2. Test Coverage: How well the test covers the feature's functionality
        3. Out of Scope: Any test steps or assertions that go beyond the feature's scope
        
        Focus on verifying that tests:
        - Stay within the feature's boundaries
        - Cover the feature's core functionality
        - Don't test unrelated features
        - Don't miss critical feature aspects
        
        You MUST return a valid JSON object with EXACTLY these fields:
        {{
            "alignment": string,  # MUST be one of: "Yes", "Partial", "No"
            "relevance_score": number,  # MUST be between 0 and 1
            "covers": [string],  # MUST be a list of aspects covered
            "missing": [string],  # MUST be a list of missing aspects
            "recommendation": string,  # MUST be one of: "Keep", "Improve", "Discard"
            "reasoning": string  # MUST be a string explaining the analysis
        }}
        
        IMPORTANT:
        - All fields are required
        - Do not add any additional fields
        - Do not modify the field names
        - Do not include any text before or after the JSON object
        - The JSON must be valid and properly formatted
        
        Be thorough in analyzing each test's alignment with the feature's scope.""")
    
    # Extract test components
    test_name = test.get('name', '')
    test_description = test.get('description', '')
    test_steps = test.get('steps', [])
    test_assertions = test.get('assertions', [])
    test_category = test.get('category', '')
    
    # Create the human prompt
    human_prompt = dedent(f"""\
        Please analyze the alignment between this test case and the feature scope:

        Test:
        Name: "{test_name}"
        Description: "{test_description}"
        Category: "{test_category}"
        Steps:
        {chr(10).join(f"{i+1}. {step}" for i, step in enumerate(test_steps))}
        Assertions:
        {chr(10).join(f"{i+1}. {assertion}" for i, assertion in enumerate(test_assertions))}

        Focus on:
        1. Whether the test stays within the feature's boundaries
        2. What key aspects of the feature are covered
        3. What important aspects are missing
        4. Whether the test should be kept, improved, or discarded

        You MUST return a valid JSON object with EXACTLY these fields:
        {{
            "alignment": string,  # MUST be one of: "Yes", "Partial", "No"
            "relevance_score": number,  # MUST be between 0 and 1
            "covers": [string],  # MUST be a list of aspects covered
            "missing": [string],  # MUST be a list of missing aspects
            "recommendation": string,  # MUST be one of: "Keep", "Improve", "Discard"
            "reasoning": string  # MUST be a string explaining the analysis
        }}

        Do not include any text before or after the JSON object.""")
    
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
            raise ValueError(f"Invalid JSON response from GPT: {str(e)}")
        
        # Ensure all required fields are present
        required_fields = ["alignment", "relevance_score", "covers", "missing", "recommendation", "reasoning"]
        missing_fields = [field for field in required_fields if field not in analysis]
        if missing_fields:
            logger.error(f"Missing required fields in analysis: {', '.join(missing_fields)}")
            logger.error(f"Raw response: {content}")
            raise ValueError(f"Missing required fields in analysis: {', '.join(missing_fields)}")
        
        # Convert string values to enums
        try:
            alignment = AlignmentLevel(analysis["alignment"])
            recommendation = Recommendation(analysis["recommendation"])
        except ValueError as e:
            logger.error(f"Invalid enum value in analysis: {str(e)}")
            raise ValueError(f"Invalid alignment or recommendation value: {str(e)}")
        
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
        raise ValueError(f"Failed to analyze intent alignment: {str(e)}")

def analyze_intent_alignment_batch(
    tests: List[Dict[str, Any]],
    feature_name: str,
    feature_description: str,
    category: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyze feature scope coverage for a batch of generated tests.
    
    Args:
        tests: List of generated test cases
        feature_name: Name of the feature being tested
        feature_description: Description of the feature being tested
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
        analysis = analyze_intent_alignment(test, feature_name, feature_description, category)
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