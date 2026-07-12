from src.generation.test_generation import generate_tests
from src.utils.dto import Product, Epic, Feature, TestCategory
from logging import getLogger, INFO, StreamHandler
import pytest
import sys
from analyze_ui_coverage import analyze_ui_coverage
from analyze_category_match import analyze_category_match
from analyze_redundancy import analyze_redundancy
from analyze_intent_alignment import analyze_intent_alignment_batch
from typing import Dict, List

# Configure logging
logger = getLogger(__name__)
logger.setLevel(INFO)
handler = StreamHandler(sys.stdout)
handler.setLevel(INFO)
logger.addHandler(handler)

@pytest.mark.asyncio
async def test_generate_tests(task_id: str):
    # Create dummy test data
    product = Product(
        name="CRM Demo",
        url="https://qacrmdemo.netlify.app/",
        description="CRM Demo",
        documentation="https://qacrmdemo.netlify.app/",
        links_to_documentation=["https://qacrmdemo.netlify.app/"]
    )
    
    epic = Epic(
        name="Customer Creation",
        description="Customer Creation"
    )
    
    feature = Feature(
        id="test-feature-123",
        name="Create Customer",
        description="Create a new customer",
        urls=["https://qacrmdemo.netlify.app/"]
    )
    
    # Context with job ID
    ctx = {
        "job_id": task_id
    }

    # Test different category scenarios and collect scores
    scenario_scores = []
    
    # Run each scenario and collect scores
    negative_score = await run_category_scenario(ctx, product, epic, feature, [TestCategory.NEGATIVE.value], "Negative Tests Only")
    scenario_scores.append(("Negative Tests Only", negative_score))
    
    smoke_score = await run_category_scenario(ctx, product, epic, feature, [TestCategory.SMOKE.value], "Smoke Tests Only")
    scenario_scores.append(("Smoke Tests Only", smoke_score))
    
    both_score = await run_category_scenario(ctx, product, epic, feature, [TestCategory.NEGATIVE.value, TestCategory.SMOKE.value], "Both Negative and Smoke Tests")
    scenario_scores.append(("Both Negative and Smoke Tests", both_score))
    
    # Calculate and display average score
    average_score = sum(score for _, score in scenario_scores) / len(scenario_scores)
    
    print("\n=== Overall Score Analysis ===")
    print("\nIndividual Scenario Scores:")
    for scenario_name, score in scenario_scores:
        print(f"{scenario_name}: {score:.2f}%")
    print(f"\nAverage Score Across All Scenarios: {average_score:.2f}%")
    
    # Assert minimum average score
    assert average_score >= 10, f"Average score {average_score:.2f}% is below minimum threshold of 10%"

async def run_category_scenario(ctx: Dict, product: Product, epic: Epic, feature: Feature, categories: List[str], scenario_name: str) -> float:
    """
    Test a specific category scenario for test generation.
    
    Args:
        ctx: Context dictionary with job ID
        product: Product information
        epic: Epic information
        feature: Feature information
        categories: List of test categories to generate
        scenario_name: Name of the scenario being tested
        
    Returns:
        float: The total score for this scenario
    """
    print(f"\n=== Testing Scenario: {scenario_name} ===")
    
    # Generate tests
    result = await generate_tests(
        ctx=ctx,
        product=product.model_dump(),
        epic=epic.model_dump(),
        feature=feature.model_dump(),
        categories=categories
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
    
    # Analyze UI coverage
    coverage_analysis = analyze_ui_coverage(generated_tests)
    
    # Log coverage analysis
    print("\n=== UI Coverage Analysis ===")
    print(f"\nTotal Tests: {coverage_analysis.get('total_tests', 0)}")
    print(f"\nUnique Selectors: {len(coverage_analysis.get('unique_selectors', []))}")
    print(f"Unique Pages: {len(coverage_analysis.get('unique_pages', []))}")
    print(f"Unique UI Elements: {len(coverage_analysis.get('unique_ui_elements', []))}")
    
    metrics = coverage_analysis.get('metrics', {})
    print(f"\nAverage Selectors per Test: {metrics.get('average_selectors_per_test', 0):.2f}")
    print(f"Average Pages per Test: {metrics.get('average_pages_per_test', 0):.2f}")
    print(f"Average Elements per Test: {metrics.get('average_elements_per_test', 0):.2f}")
    
    # Analyze category match
    category_analysis = analyze_category_match(generated_tests, ','.join(categories))
    
    # Log category analysis
    print("\n=== Category Match Analysis ===")
    category_summary = category_analysis.get('category_match_summary', {})
    print(f"\nRequested Categories: {', '.join(categories)}")
    print(f"Matching Tests: {category_summary.get('matching_tests', 0)}")
    print(f"Non-matching Tests: {category_summary.get('non_matching_tests', 0)}")
    print(f"Match Percentage: {category_summary.get('match_percentage', 0):.2f}%")
    
    print("\nTest Analysis:")
    for test_analysis in category_analysis.get('test_analysis', []):
        print(f"\nTest: {test_analysis['test_name']}")
        print(f"Assigned Category: {test_analysis['assigned_category']}")
        print(f"Matches Requested: {test_analysis['matches_requested']}")
        print(f"Confidence Score: {test_analysis['confidence_score']:.2f}")
        print(f"Reasoning: {test_analysis['reasoning']}")
    
    # Calculate category score using the same analysis
    category_score = category_summary.get('match_percentage', 0)
    
    # Analyze redundancy
    redundancy_analysis = analyze_redundancy(generated_tests)
    
    # Log redundancy analysis
    print("\n=== Redundancy Analysis ===")
    redundancy_summary = redundancy_analysis.get('redundancy_summary', {})
    print(f"\nOverall Redundancy Score: {redundancy_summary.get('overall_redundancy_score', 0):.2f}%")
    print(f"High Redundancy Pairs: {redundancy_summary.get('high_redundancy_pairs', 0)}")
    print(f"Medium Redundancy Pairs: {redundancy_summary.get('medium_redundancy_pairs', 0)}")
    print(f"Low Redundancy Pairs: {redundancy_summary.get('low_redundancy_pairs', 0)}")
    
    print("\nTest Pairs Analysis:")
    for pair in redundancy_analysis.get('test_pairs_analysis', []):
        print(f"\nPair: {pair['test1']} <-> {pair['test2']}")
        print(f"Redundancy Score: {pair['redundancy_score']:.2f}%")
        print(f"Redundancy Type: {pair['redundancy_type']}")
        print("Similarity Details:")
        for key, value in pair['similarity_details'].items():
            print(f"- {key}: {value:.2f}%")
        print(f"Recommendation: {pair['recommendation']}")
    
    print("\nRecommendations:")
    for recommendation in redundancy_analysis.get('recommendations', []):
        print(f"- {recommendation}")
    
    # Analyze intent alignment
    intent_analysis = analyze_intent_alignment_batch(
        generated_tests,
        feature_name=feature.name,
        feature_description=feature.description,
        category=categories[0] if len(categories) == 1 else None
    )
    
    # Log intent alignment analysis
    print("\n=== Intent Alignment Analysis ===")
    intent_summary = intent_analysis.get('intent_alignment_summary', {})
    print(f"\nTotal Tests: {intent_summary.get('total_tests', 0)}")
    print(f"Average Relevance Score: {intent_summary.get('average_relevance_score', 0):.2f}")
    print(f"Keep Count: {intent_summary.get('keep_count', 0)}")
    print(f"Improve Count: {intent_summary.get('improve_count', 0)}")
    print(f"Discard Count: {intent_summary.get('discard_count', 0)}")
    print(f"Keep Percentage: {intent_summary.get('keep_percentage', 0):.2f}%")
    
    print("\nTest Analysis:")
    for test_analysis in intent_analysis.get('test_analysis', []):
        print(f"\nTest: {test_analysis['test_name']}")
        print(f"Alignment: {test_analysis['alignment']}")
        print(f"Relevance Score: {test_analysis['relevance_score']:.2f}")
        print(f"Covers: {', '.join(test_analysis['covers'])}")
        if test_analysis['missing']:
            print(f"Missing: {', '.join(test_analysis['missing'])}")
        print(f"Recommendation: {test_analysis['recommendation']}")
        print(f"Reasoning: {test_analysis['reasoning']}")
    
    print("\nRecommendations:")
    for recommendation in intent_analysis.get('recommendations', []):
        print(f"- {recommendation}")
    
    # Calculate scores
    unique_elements = len(coverage_analysis.get('unique_ui_elements', []))
    unique_selectors = len(coverage_analysis.get('unique_selectors', []))
    total_tests = len(generated_tests)
    
    total_possible_interactions = total_tests * 5
    total_unique_interactions = unique_elements + unique_selectors
    interaction_coverage = (total_unique_interactions / total_possible_interactions) * 100
    interaction_coverage = min(interaction_coverage, 100)
    
    redundancy_penalty = redundancy_analysis.get('redundancy_summary', {}).get('overall_redundancy_score', 0)
    intent_score = intent_summary.get('average_relevance_score', 0) * 100
    
    # Calculate total score
    total_score = (
        (interaction_coverage * 0.20) +
        (category_score * 0.30) +
        (intent_score * 0.40) -
        (redundancy_penalty * 0.1)
    )
    
    print("\n=== Total Score Analysis ===")
    print(f"Interaction Coverage: {interaction_coverage:.2f}%")
    print(f"Category Match Score: {category_score:.2f}%")
    print(f"Intent Alignment Score: {intent_score:.2f}%")
    print(f"Redundancy Penalty: {redundancy_penalty:.2f}%")
    print(f"Total Score: {total_score:.2f}%")
    
    # Assertions
    assert result["status"] == "passed", "Test generation failed"
    assert len(generated_tests) > 0, "No tests were generated"
    assert total_score >= 10, f"Total score {total_score:.2f}% is below minimum threshold of 10%"
    assert category_score >= 50, "Category match percentage should be at least 50%"
    assert redundancy_penalty < 90, "Overall redundancy score should be less than 90%"
    assert intent_score >= 0.1, "Average relevance score should be at least 0.1"
    
    return total_score


