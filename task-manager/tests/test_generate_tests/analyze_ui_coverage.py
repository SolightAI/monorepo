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

def analyze_ui_coverage(tests: List[Dict]) -> Dict:
    """
    Analyze UI coverage from generated tests using GPT-4.
    
    Args:
        tests: List of test dictionaries containing test details
        
    Returns:
        Dictionary containing coverage analysis results
    """
    # Initialize GPT-4
    llm = ChatOpenAI(model="gpt-4", temperature=0)
    
    # Create the system prompt
    system_prompt = """You are an expert UI test coverage analyzer. Your task is to analyze a set of test cases and extract information about UI coverage.
    
    For each test, analyze:
    1. UI Elements: Look for specific UI components like:
       - Buttons (submit, click, press, tap)
       - Links (click link, navigate to)
       - Forms (input fields, text areas)
       - Dropdowns (select, choose from)
       - Checkboxes and radio buttons
       - Tables and lists
       - Modals and dialogs
       - Navigation elements
       - Headers and footers
       - Any other interactive elements
    
    2. Pages/Sections: Identify distinct pages or sections being tested:
       - Login pages
       - Dashboard views
       - Settings pages
       - Form pages
       - List views
       - Detail pages
       - Modal windows
       - Any other distinct UI sections
    
    3. Selectors: Look for specific ways to identify elements:
       - CSS selectors (#id, .class)
       - XPath expressions
       - Data attributes (data-testid, data-cy)
       - ARIA attributes (aria-label, aria-describedby)
       - Text content
       - Element types (button, input, select)
       - Any other element identifiers
    
    You must return a valid JSON object in the following format:
    {
        "total_tests": number,
        "unique_selectors": [list of unique selectors],
        "unique_pages": [list of unique pages/sections],
        "unique_ui_elements": [list of unique UI elements],
        "selector_usage": {"selector": count},
        "page_usage": {"page": count},
        "element_usage": {"element": count},
        "metrics": {
            "selector_coverage": number,
            "page_coverage": number,
            "element_coverage": number,
            "average_selectors_per_test": number,
            "average_pages_per_test": number,
            "average_elements_per_test": number
        }
    }
    
    Be thorough in identifying UI elements, pages, and selectors from the test descriptions, steps, and assertions. Look for both explicit mentions and implicit references to UI components."""
    
    # Create the human prompt with test data
    test_data = json.dumps(tests, indent=2)
    human_prompt = f"""Please analyze the following test cases and provide UI coverage analysis:

{test_data}

Focus on identifying:
1. All UI elements (buttons, links, forms, sections, etc.) - look for both explicit mentions and implicit references
2. All pages or sections being tested - consider the context and flow of the tests
3. Any specific selectors or identifiers used - look for patterns in how elements are referenced
4. Usage frequency of each element, page, and selector - count how often each is used across tests

Be especially thorough in identifying:
- Interactive elements (buttons, links, inputs)
- Navigation elements (menus, breadcrumbs)
- Form elements (inputs, selects, checkboxes)
- Content containers (tables, lists, cards)
- Modal dialogs and popups
- Any element that users can interact with

For each test, analyze:
1. The test description for context about the feature being tested
2. The preconditions for any UI elements that must be present
3. The steps for explicit UI interactions
4. The assertions for UI state verifications

You must return a valid JSON object in the specified format. Do not include any text before or after the JSON object."""
    
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
        if not all(key in analysis for key in ["total_tests", "unique_selectors", "unique_pages", "unique_ui_elements", "metrics"]):
            raise ValueError("Missing required fields in analysis")
            
        # Calculate metrics if not provided or invalid
        total_tests = len(tests)
        if not analysis.get("metrics") or not all(key in analysis["metrics"] for key in [
            "selector_coverage", "page_coverage", "element_coverage",
            "average_selectors_per_test", "average_pages_per_test", "average_elements_per_test"
        ]):
            analysis["metrics"] = {
                "selector_coverage": len(analysis.get("unique_selectors", [])) / total_tests * 100 if total_tests > 0 else 0,
                "page_coverage": len(analysis.get("unique_pages", [])) / total_tests * 100 if total_tests > 0 else 0,
                "element_coverage": len(analysis.get("unique_ui_elements", [])) / total_tests * 100 if total_tests > 0 else 0,
                "average_selectors_per_test": len(analysis.get("unique_selectors", [])) / total_tests if total_tests > 0 else 0,
                "average_pages_per_test": len(analysis.get("unique_pages", [])) / total_tests if total_tests > 0 else 0,
                "average_elements_per_test": len(analysis.get("unique_ui_elements", [])) / total_tests if total_tests > 0 else 0
            }
            
        return analysis
        
    except Exception as e:
        logger.error(f"Failed to analyze UI coverage: {str(e)}")
        
        # Provide a default analysis
        return {
            "total_tests": len(tests),
            "unique_selectors": [],
            "unique_pages": [],
            "unique_ui_elements": [],
            "selector_usage": {},
            "page_usage": {},
            "element_usage": {},
            "metrics": {
                "selector_coverage": 0,
                "page_coverage": 0,
                "element_coverage": 0,
                "average_selectors_per_test": 0,
                "average_pages_per_test": 0,
                "average_elements_per_test": 0
            }
        }

