import os
import re
from datetime import datetime
import requests
from typing import Dict, List, Tuple

# Import functions from client.py
from client import (
    create_product,
    create_epic,
    create_feature,
    create_user_story,
    create_test,
    create_bug
)

# Priority to SeverityLevel mapping
PRIORITY_TO_SEVERITY = {
    "🔴": "Critical",  # P0
    "🟠": "High",      # P1
    "🟡": "Medium",    # P2
    "🟢": "Low",       # P3
}

def parse_bug_report(file_path: str) -> List[Dict]:
    """Parse the bug report file and extract bug information"""
    with open(file_path, 'r') as file:
        content = file.read()
    
    # Common pattern for all bugs: header with priority emoji, title, and description
    # This will capture both the "Visual Testing" and "User Flow Testing" sections
    bug_pattern = r'###\s*([🔴🟠🟡🟢])\s*(.*?)\n\n(?:\*\*Description:\*\*\n\n)?(.*?)(?=\n\n- \*\*Screenshot|\n\n###|\n\n##|\Z)'
    bugs = re.findall(bug_pattern, content, re.DOTALL)
    
    parsed_bugs = []
    
    # Determine the section a bug belongs to (User Flow Testing or Visual Testing)
    user_flow_section_match = re.search(r'## User Flow Testing(.*?)(?:## Visual Testing|\Z)', content, re.DOTALL)
    visual_section_match = re.search(r'## Visual Testing(.*?)(?:\Z)', content, re.DOTALL)
    
    user_flow_content = user_flow_section_match.group(1) if user_flow_section_match else ""
    visual_content = visual_section_match.group(1) if visual_section_match else ""
    
    # Process all bugs
    for severity_emoji, title, description in bugs:
        # Clean up the text
        title = title.strip()
        description = description.strip()
        
        # Determine if this is a functional or visual bug based on its location in the report
        bug_text = f"### {severity_emoji} {title}\n\n{description}"
        bug_type = "functional" if bug_text in user_flow_content else "visual"
        
        # Set appropriate test category based on bug type
        test_category = "FUNCTIONAL" if bug_type == "functional" else "USABILITY"
        
        parsed_bugs.append({
            "severity": PRIORITY_TO_SEVERITY.get(severity_emoji, "Low"),
            "title": title,
            "description": description,
            "type": bug_type,
            "category": test_category,
            # Include screenshots if available
            "screenshots": extract_screenshots(bug_text, content)
        })
    
    print(f"Parsed {len(parsed_bugs)} bugs: {len([b for b in parsed_bugs if b['type'] == 'functional'])} functional and {len([b for b in parsed_bugs if b['type'] == 'visual'])} visual")
    
    return parsed_bugs

def extract_screenshots(bug_text: str, content: str) -> List[str]:
    """Extract screenshot URLs for a bug"""
    # Find the section in the content that matches the bug text
    bug_start = content.find(bug_text)
    if bug_start == -1:
        # Try with a more flexible match
        lines = bug_text.split("\n")
        if lines:
            # Try matching just the title line
            title_line = lines[0]
            bug_start = content.find(title_line)
            if bug_start == -1:
                return []

    # Look for the screenshot section
    screenshot_section_start = content.find("- **Screenshot", bug_start)
    if screenshot_section_start == -1:
        return []

    # Find the next bug or section
    next_section = re.search(r'###|\n\n##', content[screenshot_section_start:])
    screenshot_section_end = screenshot_section_start + next_section.start() if next_section else len(content)

    # Extract the screenshot section
    screenshot_section = content[screenshot_section_start:screenshot_section_end]

    # Extract image URLs - both markdown format ![text](url) and direct image paths
    image_urls = []

    # Regular markdown image format
    md_image_pattern = r'!\[(.*?)\]\((.*?)\)'
    md_images = re.findall(md_image_pattern, screenshot_section)
    image_urls.extend([img[1] for img in md_images])

    # Also look for direct image references like "image.png"
    image_refs = re.findall(r'(?:\/|\s)([\w.-]+\.(?:png|jpg|jpeg|gif))(?:\/|\s|$)', screenshot_section)
    image_urls.extend(image_refs)

    # For this specific report format, extract images with the pattern "PI - Mobile Interface Report {hash}/{image}"
    if "PI - Mobile Interface Report" in screenshot_section:
        report_images = re.findall(r'PI\s*-\s*Mobile\s*Interface\s*Report\s*[a-f0-9]+\/([\w.-]+\.(?:png|jpg|jpeg|gif))', screenshot_section)
        image_urls.extend([f"PI - Mobile Interface Report 1acf1e9c39ff8014a93dc3b08c958bbe/{img}" for img in report_images])

    return list(set(image_urls))  # Remove duplicates

def create_project_structure() -> Dict:
    """Create the necessary project structure (product, epic, features, user stories, tests)"""
    # Create the main product
    product = create_product(
        name="PI Mobile Interface",
        description="Mobile interface for the PI application",
        url="https://www.predictiveindex.com/",
        documentation="Mobile usability and design issues across multiple pages"
    )

    # Create two epics for visual and functional bugs
    visual_epic = create_epic(
        product_id=product["id"],
        name="Visual Issues",
        description="Visual design and layout issues in the mobile interface"
    )

    functional_epic = create_epic(
        product_id=product["id"],
        name="Functional Issues",
        description="Functional bugs and usability issues in the mobile interface"
    )

    # Create features for each page/section
    features = {}

    # Pages with issues mentioned in the report
    pages = [
        "Talent Strategy",
        "Talent Optimization Certification",
        "Education",
        "Plans",
        "HR Leaders",
        "Science Page",
        "Software Page",
        "Consultants Page",
        "PI for Managers Page",
        "Software Managing Page"
    ]

    for page in pages:
        # Create a feature for each page
        feature_visual = create_feature(
            epic_id=visual_epic["id"],
            name=f"{page} - Visual",
            description=f"Visual aspects of the {page}",
            url=f"https://www.predictiveindex.com/{page.lower().replace(' ', '-')}"
        )

        feature_functional = create_feature(
            epic_id=functional_epic["id"],
            name=f"{page} - Functional",
            description=f"Functional aspects of the {page}",
            url=f"https://www.predictiveindex.com/{page.lower().replace(' ', '-')}"
        )

        # Create user stories for each feature
        user_story_visual = create_user_story(
            feature_id=feature_visual["id"],
            title=f"As a user, I want to view {page} correctly on mobile",
            description=f"The {page} should display correctly on mobile devices"
        )

        user_story_functional = create_user_story(
            feature_id=feature_functional["id"],
            title=f"As a user, I want to use {page} functionality on mobile",
            description=f"The {page} functionality should work correctly on mobile devices"
        )

        # Create tests for each user story
        test_visual = create_test(
            user_story_id=user_story_visual["id"],
            name=f"Mobile UI Test - {page}",
            description=f"Test the visual appearance of {page} on mobile devices",
            category="USABILITY",
            status="FAILED",
            severity="Medium",
            url=f"https://www.predictiveindex.com/test/{page.lower().replace(' ', '-')}"
        )

        test_functional = create_test(
            user_story_id=user_story_functional["id"],
            name=f"Mobile Functionality Test - {page}",
            description=f"Test the functionality of {page} on mobile devices",
            category="FUNCTIONAL",
            status="FAILED",
            severity="Medium",
            url=f"https://www.predictiveindex.com/test/{page.lower().replace(' ', '-')}"
        )

        features[page] = {
            "visual": {
                "feature": feature_visual,
                "user_story": user_story_visual,
                "test": test_visual
            },
            "functional": {
                "feature": feature_functional,
                "user_story": user_story_functional,
                "test": test_functional
            }
        }

    return {
        "product": product,
        "epics": {
            "visual": visual_epic,
            "functional": functional_epic
        },
        "features": features
    }

def map_bug_to_page(bug_title: str, bug_description: str, bug_type: str) -> str:
    """Map a bug title and description to a page name based on context clues"""
    # Check for specific bugs from the user flow testing section in sequential order
    if "Talent Strategy" in bug_title or "Redirect to Staging Environment" in bug_title:
        return "Talent Strategy"
    elif "Certification" in bug_title or "Play Button" in bug_title:
        return "Talent Optimization Certification"
    elif "Education" in bug_title or "PI Education" in bug_title or "article" in bug_title.lower():
        return "Education"
    elif "Plans" in bug_title or "Product Plans" in bug_title or "Customer Stories" in bug_title:
        return "Plans"

    # For visual testing bugs, map based on section headers
    page_indicators = {
        "Talent Strategy": ["Talent Strategy"],
        "Talent Optimization Certification": ["Talent Optimization Certification", "certification", "Play Button"],
        "Education": ["Education", "PI Education", "article links", "search results"],
        "Plans": ["Plans", "Product Plans", "Customer Stories"],
        "HR Leaders": ["HR Leaders", "PI for HR Leaders", "Fixed header overlapping"],
        "Science Page": ["Science Page", "Science-backed HR software", "Oversized Hero Heading"],
        "Software Page": ["Software Page", "Excessive vertical spacing", "Fixed header overlay"],
        "Consultants Page": ["Consultants Page", "Overly Large Hero Heading", "Fixed Spacer Heights"],
        "PI for Managers Page": ["PI for Managers", "managers the tools", "outstanding leaders"],
        "Software Managing Page": ["Software Managing", "Managing Page", "Headline and Excessive Side"]
    }

    # Check both title and description
    full_text = f"{bug_title} {bug_description}".lower()

    for page, keywords in page_indicators.items():
        for keyword in keywords:
            if keyword.lower() in full_text:
                return page

    # If we couldn't find a match, use some heuristics
    if bug_type == "functional":
        # Default functional bugs to Software Page if no match found
        return "Software Page"
    else:
        # For visual bugs, look at specific content
        if "hero" in full_text or "heading" in full_text:
            return "Science Page"
        if "modal" in full_text or "form" in full_text:
            return "Software Page"
        if "header" in full_text:
            return "HR Leaders"
        if "spacing" in full_text:
            return "Consultants Page"

    # Absolute fallback
    print(f"Warning: Could not determine page for bug: '{bug_title}', defaulting to Software Page")
    return "Software Page"


def main():
    """Main function to parse bugs and create database entries"""
    report_file = "data/PI - Mobile Interface Report 1acf1e9c39ff8014a93dc3b08c958bbe.md"

    if not os.path.exists(report_file):
        print(f"Error: Bug report file not found at {report_file}")
        return

    # Parse bugs from report
    bugs = parse_bug_report(report_file)

    if not bugs:
        print("No bugs found in the report")
        return

    print(f"Found {len(bugs)} bugs in the report")

    # Create project structure
    print("Creating project structure...")
    structure = create_project_structure()

    # Create bugs in the database
    print("Creating bugs...")
    created_bugs = []

    for bug in bugs:
        try:
            # Determine which page this bug belongs to
            page = map_bug_to_page(bug["title"], bug["description"], bug["type"])
            bug_type = bug["type"]  # visual or functional
            
            # Get the appropriate test for this bug
            if page not in structure["features"]:
                print(f"Warning: Page '{page}' not found in structure. Defaulting to Software Page.")
                page = "Software Page"
                
            if bug_type not in structure["features"][page]:
                print(f"Warning: Bug type '{bug_type}' not found for page '{page}'. Defaulting to visual.")
                bug_type = "visual"
            
            test = structure["features"][page][bug_type]["test"]
            
            # Create the bug
            created_bug = create_bug(
                test_id=test["id"],
                title=bug["title"],
                description=bug["description"],
                severity=bug["severity"],
                url=f"https://www.predictiveindex.com/bugs/{bug['title'].lower().replace(' ', '-')}",
                status="OPEN",
                detected_at=datetime.now().isoformat()
                # Screenshots are not handled by the client function yet
            )
            
            created_bugs.append(created_bug)
            print(f"Created bug: {bug['title']} (Severity: {bug['severity']}) with {len(bug.get('screenshots', []))} screenshots")
            
            # Also print the screenshots for reference
            if bug.get("screenshots"):
                print(f"  Screenshots: {', '.join(bug['screenshots'])}")
                
        except Exception as e:
            print(f"Error creating bug '{bug['title']}': {str(e)}")
            continue
    
    print(f"Successfully created {len(created_bugs)} bugs out of {len(bugs)} found in the report.")

if __name__ == "__main__":
    main() 