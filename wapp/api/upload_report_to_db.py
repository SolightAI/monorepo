#!/usr/bin/env python3
import os
import csv
import sys
from datetime import datetime
from typing import Dict, List
import argparse

# Import necessary functions from existing modules
try:
    from client import (
        create_product,
        create_epic,
        create_feature,
        create_user_story,
        create_acceptance_criteria,
        create_test,
        create_bug
    )
    from import_bugs import upload_screenshots_for_bug
except ImportError:
    print("Error: Could not import required modules.")
    print("Make sure you're running this script from the project root directory.")
    sys.exit(1)


def parse_args() -> argparse.Namespace:
    """
    Parse command line arguments.

    Returns:
        argparse.Namespace: Parsed command line arguments.
    """
    parser = argparse.ArgumentParser(description='Upload bug reports from CSV to the system')
    parser.add_argument('--csv-file', type=str, default='data-basalt/Basalt - Report.csv',
                        help='Path to the CSV file containing bug reports')
    parser.add_argument('--product-name', type=str,
                        help='Name of the product to create')
    parser.add_argument('--epic-name', type=str,
                        help='Name of the epic to create')
    parser.add_argument('--feature-name', type=str,
                        help='Name of the feature to create')
    parser.add_argument('--user-story-title', type=str,
                        help='Title of the user story to create')
    parser.add_argument('--acceptance-criteria-title', type=str,
                        help='Title of the acceptance criteria to create')
    parser.add_argument('--test-name', type=str,
                        help='Name of the test to create')
    parser.add_argument('--status', type=str, default='Open',
                        help='Initial status for the bugs')
    return parser.parse_args()


def read_csv_file(file_path: str) -> List[Dict]:
    """
    Read a CSV file containing bug reports and return a list of dictionaries.

    Args:
        file_path: Path to the CSV file.

    Returns:
        List of dictionaries representing each row in the CSV.

    Raises:
        FileNotFoundError: If the CSV file cannot be found.
    """
    if not os.path.exists(file_path):
        # Check if the path is relative to the api directory
        api_path = os.path.join('api', file_path)
        if os.path.exists(api_path):
            file_path = api_path
        else:
            raise FileNotFoundError(f"CSV file not found: {file_path}")

    bugs = []
    with open(file_path, 'r', encoding='utf-8') as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            bugs.append(row)

    return bugs


def process_screenshots(screenshot_path: str) -> List[str]:
    """
    Process screenshot paths from the CSV.

    Args:
        screenshot_path: Path to the screenshot from the CSV.

    Returns:
        List of processed screenshot URLs.
    """

    if not screenshot_path or screenshot_path.strip() == '':
        return []

    # Split by commas if multiple screenshots are provided
    screenshot_paths = [os.path.split(path.strip())[-1] for path in screenshot_path.split(',')]

    # Upload screenshots to S3
    try:
        s3_urls = upload_screenshots_for_bug(screenshot_paths, os.path.dirname(os.path.abspath(__file__)) + "/data-basalt/Basalt")
        return s3_urls
    except Exception as e:
        print(f"Warning: Failed to upload screenshots: {e}")
        return []


def get_project_info(args: argparse.Namespace) -> Dict[str, str]:
    """
    Get required information for the project hierarchy.

    Args:
        args: Command line arguments.

    Returns:
        Dictionary containing all required project information.
    """
    info = {
        'product_name': args.product_name,
        'product_description': None,
        'product_url': None,
        'product_documentation': None,

        'epic_name': args.epic_name,
        'epic_description': None,

        'feature_name': args.feature_name,
        'feature_description': None,
        'feature_url': None,

        'user_story_title': args.user_story_title,
        'user_story_description': None,

        'acceptance_criteria_title': args.acceptance_criteria_title,
        'acceptance_criteria_description': None,

        'test_name': args.test_name,
        'test_description': None,
        'test_category': 'REGRESSION',
        'test_status': 'Completed',
        'test_url': None,

        'bug_status': args.status
    }

    # Prompt for missing information
    if not info['product_name']:
        info['product_name'] = input("Product name: ")
        if not info['product_name']:
            print("Error: Product name is required")
            sys.exit(1)

    info['product_description'] = input(f"Product description [{info['product_name']} Description]: ") or f"{info['product_name']} Description"
    info['product_url'] = input("Product URL [https://example.com]: ") or "https://example.com"
    info['product_documentation'] = input("Product documentation [https://docs.example.com]: ") or "https://docs.example.com"

    if not info['epic_name']:
        info['epic_name'] = input("Epic name [Bug Fixes]: ") or "Bug Fixes"

    info['epic_description'] = input(f"Epic description [{info['epic_name']} Description]: ") or f"{info['epic_name']} Description"

    if not info['feature_name']:
        info['feature_name'] = input("Feature name [Bug Reporting]: ") or "Bug Reporting"

    info['feature_description'] = input(f"Feature description [{info['feature_name']} Description]: ") or f"{info['feature_name']} Description"
    info['feature_url'] = input(f"Feature URL [{info['product_url']}/features]: ") or f"{info['product_url']}/features"

    if not info['user_story_title']:
        info['user_story_title'] = input("User story title [Fix reported bugs]: ") or "Fix reported bugs"

    info['user_story_description'] = input("User story description [As a developer, I want to fix all reported bugs]: ") or "As a developer, I want to fix all reported bugs"

    if not info['acceptance_criteria_title']:
        info['acceptance_criteria_title'] = input("Acceptance criteria title [All bugs are fixed]: ") or "All bugs are fixed"

    info['acceptance_criteria_description'] = input("Acceptance criteria description [All bugs should be fixed and verified]: ") or "All bugs should be fixed and verified"

    if not info['test_name']:
        info['test_name'] = input("Test name [Bug verification test]: ") or "Bug verification test"

    info['test_description'] = input("Test description [Verify that all bugs are fixed]: ") or "Verify that all bugs are fixed"
    info['test_url'] = input(f"Test URL [{info['product_url']}/tests]: ") or f"{info['product_url']}/tests"

    return info


def create_project_hierarchy(info: Dict[str, str]) -> str:
    """
    Create the project hierarchy and return the test ID.

    Args:
        info: Dictionary containing all project information.

    Returns:
        Test ID to associate with the bugs.
    """
    print("Creating project hierarchy...")

    # Create product
    print(f"Creating product: {info['product_name']}")
    product = create_product(
        name=info['product_name'],
        description=info['product_description'],
        url=info['product_url'],
        documentation=info['product_documentation']
    )

    # Create epic
    print(f"Creating epic: {info['epic_name']}")
    epic = create_epic(
        product_id=product["id"],
        name=info['epic_name'],
        description=info['epic_description']
    )

    # Create feature
    print(f"Creating feature: {info['feature_name']}")
    feature = create_feature(
        epic_id=epic["id"],
        name=info['feature_name'],
        description=info['feature_description'],
        url=info['feature_url']
    )

    # Create user story
    print(f"Creating user story: {info['user_story_title']}")
    user_story = create_user_story(
        feature_id=feature["id"],
        title=info['user_story_title'],
        description=info['user_story_description']
    )

    # Create acceptance criteria
    print(f"Creating acceptance criteria: {info['acceptance_criteria_title']}")
    acceptance_criteria = create_acceptance_criteria(
        user_story_id=user_story["id"],
        title=info['acceptance_criteria_title'],
        description=info['acceptance_criteria_description']
    )

    # Create test
    print(f"Creating test: {info['test_name']}")
    test = create_test(
        acceptance_criteria_id=acceptance_criteria["id"],
        name=info['test_name'],
        description=info['test_description'],
        category=info['test_category'],
        status=info['test_status'],
        url=info['test_url']
    )

    # Return the test ID
    return test["id"]


def upload_bugs(bugs: List[Dict], test_id: str, status: str) -> None:
    """
    Upload bugs to the system.

    Args:
        bugs: List of dictionaries containing bug information.
        test_id: Test ID to associate with the bugs.
        status: Initial status for the bugs.
    """
    for i, bug in enumerate(bugs, 1):
        try:
            # Map CSV fields to create_bug parameters
            title = bug.get('Name', '')
            description = bug.get('Description', '')
            severity = bug.get('Severity', 'Medium')
            url = bug.get('Link', '')
            detected_at = datetime.now().isoformat()

            # Process screenshots
            screenshots = process_screenshots(bug.get('Screenshot', ''))

            # Add conditions and suggestion to description if available
            full_description = description
            if bug.get('Conditions'):
                full_description += f"\n\nConditions: {bug['Conditions']}"
            if bug.get('Suggestion'):
                full_description += f"\n\nSuggestion: {bug['Suggestion']}"

            print(f"Uploading bug {i}/{len(bugs)}: {title}")

            # Create the bug
            create_bug(
                test_id=test_id,
                title=title,
                description=full_description,
                severity=severity,
                url=url,
                status=status,
                detected_at=detected_at,
                screenshots=screenshots
            )

            print(f"Successfully uploaded bug: {title}")

        except Exception as e:
            print(f"Error uploading bug {title}: {str(e)}")


def main() -> None:
    """
    Main function to coordinate the bug upload process.
    """
    args = parse_args()

    try:
        # Read CSV file
        bugs = read_csv_file(args.csv_file)
        print(f"Found {len(bugs)} bugs in the CSV file.")

        # Get project information
        project_info = get_project_info(args)

        # Create project hierarchy
        test_id = create_project_hierarchy(project_info)

        # Upload bugs
        upload_bugs(bugs, test_id, project_info['bug_status'])

        print(f"Successfully processed {len(bugs)} bugs.")

    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
