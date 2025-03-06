import os
import re
from datetime import datetime, timedelta
import random
import requests
import boto3
from botocore.exceptions import NoCredentialsError
import uuid
import hashlib
from typing import Dict, List, Tuple
import mimetypes
import io
from PIL import Image

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

# Base URL for API calls
BASE_URL = "http://localhost:8000"

# S3 configuration
# S3_BUCKET = "pi-mobile-bug-screenshots"
# S3_REGION = "us-east-1"
# S3_BASE_URL = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com"

if "AWS_ENDPOINT_URL" not in os.environ:
    raise RuntimeError("AWS_ENDPOINT_URL not set, using mock S3 URLs")

if "AWS_ACCESS_KEY" not in os.environ or "AWS_SECRET_KEY" not in os.environ:
    raise RuntimeError("AWS_ACCESS_KEY or AWS_SECRET_KEY not set, using mock S3 URLs")

# Flag to determine if we should use S3 or local mock

def get_s3_client():
    """Get S3 client with appropriate credentials"""

    return boto3.client(
        "s3",
        endpoint_url=os.environ["AWS_ENDPOINT_URL"],
        aws_access_key_id=os.environ["AWS_ACCESS_KEY"],
        aws_secret_access_key=os.environ["AWS_SECRET_KEY"]
    )

    # If using local mock, return None
    
    # # Check for AWS credentials in environment variables
    # aws_access_key = os.environ.get("AWS_ACCESS_KEY_ID")
    # aws_secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
    
    # if aws_access_key and aws_secret_key:
    #     # Use provided credentials
    #     return boto3.client(
    #         's3',
    #         aws_access_key_id=aws_access_key,
    #         aws_secret_access_key=aws_secret_key,
    #         region_name=S3_REGION
    #     )
    # else:
    #     # Try to use credentials from AWS configuration
    #     try:
    #         return boto3.client('s3', region_name=S3_REGION)
    #     except Exception as e:
    #         print(f"Error creating S3 client: {str(e)}")
    #         return None

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
        
        # Extract URL from the bug section
        url = None
        bug_section = re.search(rf'###\s*{re.escape(severity_emoji)}\s*{re.escape(title)}.*?(?=###|\Z)', content, re.DOTALL)
        if bug_section:
            # Match both markdown link format [url](url) and plain url format
            link_match = re.search(r'link:\s*(?:\[(.*?)\]\((.*?)\)|([^\s\]]+))', bug_section.group(0), re.DOTALL)
            if link_match:
                # If it's a markdown link, group 2 has the URL, otherwise group 3 has the URL
                url = link_match.group(2) if link_match.group(2) else link_match.group(3) if link_match.group(3) else link_match.group(1)
            else:
                # Try a simpler pattern as fallback
                raise RuntimeError(f"No URL found for bug: {title}")
        
        parsed_bugs.append({
            "severity": PRIORITY_TO_SEVERITY.get(severity_emoji, "Low"),
            "title": title,
            "description": description,
            "type": bug_type,
            "category": test_category,
            # Include the extracted URL if found
            "url": url,
            # Include screenshots if available
            "screenshots": extract_screenshots(bug_text, content)
        })
        print("screenshots:", extract_screenshots(bug_text, content))
    
    print(f"Parsed {len(parsed_bugs)} bugs: {len([b for b in parsed_bugs if b['type'] == 'functional'])} functional and {len([b for b in parsed_bugs if b['type'] == 'visual'])} visual")
    
    return parsed_bugs

def extract_screenshots(bug_text: str, content: str) -> List[str]:
    """Extract screenshot URLs for a bug"""
    # Extract the title from the bug_text
    title_match = re.search(r'###\s*([🔴🟠🟡🟢])\s*(.*?)(?:\n|$)', bug_text)
    if not title_match:
        return []
    
    emoji, title = title_match.groups()
    
    # Find the bug in the content
    bug_pattern = rf'###\s*{re.escape(emoji)}\s*{re.escape(title.strip())}'
    bug_match = re.search(bug_pattern, content)
    
    if not bug_match:
        return []
    
    bug_start = bug_match.start()
    
    # Find the screenshot section
    screenshot_start = content.find("- **Screenshot", bug_start)
    if screenshot_start == -1:
        return []
    
    # Find the end of this bug's section (next bug or main section)
    next_section_match = re.search(r'(?:\n##|\n###)', content[screenshot_start:])
    screenshot_end = len(content) if not next_section_match else screenshot_start + next_section_match.start()
    
    # Extract the screenshot section
    screenshot_section = content[screenshot_start:screenshot_end]
    
    # Find all image paths
    image_urls = []
    
    # Match Markdown image syntax: ![alt text](image path)
    image_matches = re.findall(r'!\[.*?\]\((.*?)\)', screenshot_section)
    for img_path in image_matches:
        # Clean URL encoding if present
        img_path = img_path.replace('%20', ' ')
        image_urls.append(img_path)
    
    # Also check for nested images or multiple images in bullet points
    nested_images = []
    # Look for sections like "- 0\n![0.png]..." or numbered sections
    section_matches = re.finditer(r'(?:- \d+|\d+\n)\s+!\[.*?\]\((.*?)\)', screenshot_section, re.DOTALL)
    for match in section_matches:
        img_path = match.group(1).replace('%20', ' ')
        nested_images.append(img_path)
    
    # Add any nested images that weren't caught by the first pattern
    for img in nested_images:
        if img not in image_urls:
            image_urls.append(img)
    
    print(f"Debug - Found {len(image_urls)} screenshots for '{title}': {image_urls}")
    
    return image_urls

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

def update_test_status(test_id: str, status: str, started_at: str = None, ended_at: str = None) -> Dict:
    """Update the status of a test using the PUT /{test_id}/status endpoint"""
    data = {
        "status": status
    }

    # Add timestamps if provided
    if started_at:
        data["started_at"] = started_at
    if ended_at:
        data["ended_at"] = ended_at

    response = requests.put(f"{BASE_URL}/tests/{test_id}/status", json=data)

    if response.status_code != 200:
        raise RuntimeError(f"Failed to update test status: {response.status_code} - {response.text}")

    print(f"Updated test {test_id} status to {status}")
    return response.json()

def upload_to_s3(local_file_path: str, s3_file_name: str = None) -> str:
    """
    Upload a file to S3 bucket and return the URL.
    If s3_file_name is not provided, use the local file name.

    The function generates a consistent file name based on the content hash
    and checks if the file already exists in S3 before uploading.
    """

    # Get S3 client
    s3_client = get_s3_client()

    # If no S3 file name provided, use the original file name
    if s3_file_name is None:
        s3_file_name = os.path.basename(local_file_path)

    try:
        # Generate a content hash as a consistent identifier for the file
        with open(local_file_path, 'rb') as f:
            file_content = f.read()
            content_hash = hashlib.md5(file_content).hexdigest()

        # Create a consistent filename using the hash
        file_extension = os.path.splitext(s3_file_name)[1]
        s3_file_name = f"{content_hash}{file_extension}"

        # Check if the file already exists in S3
        try:
            s3_client.head_object(
                Bucket=os.environ["AWS_BUCKET_NAME"],
                Key=s3_file_name
            )
            # If no exception is raised, the file exists
            print(f"File already exists in S3 with name: {s3_file_name}")
            # Return the URL without uploading again
            return f"https://{os.environ['AWS_BUCKET_NAME']}.s3.fr-par.scw.cloud/{os.environ['AWS_BUCKET_NAME']}/{s3_file_name}"
        except:
            # File doesn't exist, proceed with upload
            pass

        # Get file mime type
        content_type, _ = mimetypes.guess_type(local_file_path)
        if not content_type:
            content_type = "application/octet-stream"

        # Upload the file
        s3_client.upload_file(
            local_file_path,
            os.environ["AWS_BUCKET_NAME"],
            s3_file_name,
            ExtraArgs={'ACL': 'public-read', 'ContentType': content_type}
        )

        return f"https://{os.environ['AWS_BUCKET_NAME']}.s3.fr-par.scw.cloud/{os.environ['AWS_BUCKET_NAME']}/{s3_file_name}"

    except FileNotFoundError:
        raise RuntimeError(f"Error: The file {local_file_path} was not found")
        return None
    except NoCredentialsError:
        raise RuntimeError("Error: AWS credentials not available")
        return None
    except Exception as e:
        raise RuntimeError(f"Error uploading to S3: {str(e)}")
        return None

def create_thumbnail_if_needed(image_path: str) -> str:
    """
    Create a thumbnail if the image is too large.
    Returns the path to the original image or the thumbnail if created.
    """
    try:
        # Maximum dimensions
        MAX_WIDTH = 1200
        MAX_HEIGHT = 1200
        
        # Open the image
        with Image.open(image_path) as img:
            width, height = img.size
            
            # Check if resizing is needed
            if width <= MAX_WIDTH and height <= MAX_HEIGHT:
                return image_path
            
            # Calculate new dimensions
            if width > height:
                new_width = MAX_WIDTH
                new_height = int(height * (MAX_WIDTH / width))
            else:
                new_height = MAX_HEIGHT
                new_width = int(width * (MAX_HEIGHT / height))
            
            # Resize the image
            img = img.resize((new_width, new_height), Image.LANCZOS)
            
            # Save the thumbnail
            thumbnail_path = f"{os.path.splitext(image_path)[0]}_thumbnail{os.path.splitext(image_path)[1]}"
            img.save(thumbnail_path, quality=85, optimize=True)
            print(f"Created thumbnail: {thumbnail_path}")
            
            return thumbnail_path
    except Exception as e:
        print(f"Error creating thumbnail: {str(e)}")
        return image_path  # Return original path if any error occurs

def upload_screenshots_for_bug(screenshots: List[str], report_dir: str) -> List[str]:
    """
    Upload screenshots to S3 and return the list of URLs.
    Screenshots may be relative paths within the report directory.
    """
    uploaded_urls = []

    for screenshot in screenshots:
        # Check if this is a relative path within the report
        if "/" in screenshot:
            # Handle paths like "PI - Mobile Interface Report 1acf1e9c39ff8014a93dc3b08c958bbe/image.png"
            # by looking in the report directory
            local_path = os.path.join(report_dir, screenshot)
        else:
            # For simple filenames, look in the report directory
            local_path = os.path.join(report_dir, screenshot)

        # If the file exists, upload it
        if os.path.exists(local_path):
            # Create a thumbnail if needed
            optimized_path = create_thumbnail_if_needed(local_path)

            # Upload to S3
            s3_url = upload_to_s3(optimized_path)
            if s3_url:
                uploaded_urls.append(s3_url)
                print(f"Uploaded {screenshot} to S3: {s3_url}")

                # Clean up thumbnail if created
                if optimized_path != local_path and os.path.exists(optimized_path):
                    try:
                        os.remove(optimized_path)
                    except:
                        pass
        else:
            print(f"Warning: Screenshot file not found: {local_path}")

    return uploaded_urls

def main():
    """Main function to parse bugs and create database entries"""
    report_file = "data/PI - Mobile Interface Report 1acf1e9c39ff8014a93dc3b08c958bbe.md"
    report_dir = os.path.dirname(report_file)
    
    if not os.path.exists(report_file):
        print(f"Error: Bug report file not found at {report_file}")
        return
    
    # Create S3 bucket if using real S3
    s3_client = get_s3_client()
    
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
    updated_tests = set()  # Track which tests we've already updated

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

            # Upload screenshots to S3 if available
            screenshot_urls = []
            if bug.get("screenshots"):
                print(f"Uploading {len(bug['screenshots'])} screenshots for bug: {bug['title']}")
                screenshot_urls = upload_screenshots_for_bug(bug["screenshots"], report_dir)

            # Create the bug
            created_bug = create_bug(
                test_id=test["id"],
                title=bug["title"],
                description=bug["description"],
                severity=bug["severity"],
                url=bug.get("url") or f"https://www.predictiveindex.com/bugs/{bug['title'].lower().replace(' ', '-')}",
                status="OPEN",
                detected_at=datetime.now().isoformat(),
                screenshots=screenshot_urls  # Include S3 URLs here
            )

            created_bugs.append(created_bug)
            print(f"Created bug: {bug['title']} (Severity: {bug['severity']}) with {len(screenshot_urls)} S3 screenshot URLs")
            
            # Also print the URL for reference
            if bug.get("url"):
                print(f"  Bug URL: {bug['url']}")
            
            # Also print the screenshots for reference
            if screenshot_urls:
                print(f"  Screenshot URLs: {', '.join(screenshot_urls)}")
            
            # Update the test status to FAILED (if not already updated)
            if test["id"] not in updated_tests:
                # Set start time to a random time in the past (1-10 days ago)
                start_time = datetime.now() - timedelta(days=random.randint(1, 10))
                
                # Set end time to a random time between start_time and now
                max_hours = int((datetime.now() - start_time).total_seconds() / 3600) - 1
                if max_hours <= 0:
                    end_time = datetime.now()
                else:
                    hours_later = random.randint(1, min(max_hours, 8))
                    end_time = start_time + timedelta(hours=hours_later)
                
                # Update the test status
                update_test_status(
                    test_id=test["id"],
                    status="FAILED",
                    started_at=start_time.isoformat(),
                    ended_at=end_time.isoformat()
                )
                
                updated_tests.add(test["id"])
                
        except Exception as e:
            print(f"Error creating bug '{bug['title']}': {str(e)}")
            continue
    
    print(f"Successfully created {len(created_bugs)} bugs out of {len(bugs)} found in the report.")
    print(f"Updated {len(updated_tests)} tests to FAILED status.")

if __name__ == "__main__":
    main() 