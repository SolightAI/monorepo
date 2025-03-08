import requests


BASE_URL = "http://localhost:8000"


def create_product(name: str, description: str, url: str, documentation: str) -> None:
    response = requests.post(f"{BASE_URL}/products/", json={"name": name, "description": description, "url": url, "documentation": documentation})

    if response.status_code != 200:
        raise RuntimeError(f"Received non-200 status code ({response.status_code}): {response.text}")
    return response.json()


def create_epic(product_id: str, name: str, description: str) -> None:
    response = requests.post(f"{BASE_URL}/epics/", json={"name": name, "description": description, "product_id": product_id})

    if response.status_code != 200:
        raise RuntimeError(f"Received non-200 status code ({response.status_code}): {response.text}")
    return response.json()


def create_feature(epic_id: str, name: str, description: str, url: str) -> None:
    response = requests.post(f"{BASE_URL}/features/", json={"name": name, "description": description, "epic_id": epic_id, "urls": [url]})

    if response.status_code != 200:
        raise RuntimeError(f"Received non-200 status code ({response.status_code}): {response.text}")
    return response.json()


def create_user_story(feature_id: str, title: str, description: str) -> None:
    response = requests.post(f"{BASE_URL}/user_stories/", json={"title": title, "description": description, "feature_id": feature_id})

    if response.status_code != 200:
        raise RuntimeError(f"Received non-200 status code ({response.status_code}): {response.text}")
    return response.json()


def create_acceptance_criteria(user_story_id: str, title: str, description: str) -> None:
    """Create acceptance criteria for a user story.
    
    Args:
        user_story_id: ID of the user story this acceptance criteria is associated with
        title: Acceptance criteria title
        description: Acceptance criteria description
    """
    response = requests.post(f"{BASE_URL}/acceptance_criteria/", json={"title": title, "description": description, "user_story_id": user_story_id})

    if response.status_code != 200:
        raise RuntimeError(f"Received non-200 status code ({response.status_code}): {response.text}")
    return response.json()


def create_test(acceptance_criteria_id: str, name: str, description: str, category: str, status: str, url: str) -> None:
    """Create a test for acceptance criteria.
    
    Args:
        acceptance_criteria_id: ID of the acceptance criteria this test is associated with
        name: Test name
        description: Test description
        category: Test category (SMOKE, FUNCTIONAL, END_TO_END, UNIT, etc.)
        status: Test status (NOT_STARTED, PENDING, PASSED, FAILED, etc.)
        url: URL to the test
    """
    response = requests.post(f"{BASE_URL}/tests/", json={"name": name, "description": description, "acceptance_criteria_id": acceptance_criteria_id, "category": category, "status": status, "url": url})

    if response.status_code != 200:
        raise RuntimeError(f"Received non-200 status code ({response.status_code}): {response.text}")
    return response.json()


def create_bug(test_id: str, title: str, description: str, severity: str, url: str, status: str, detected_at: str, screenshots: list = None) -> None:
    """Create a bug in the database.

    Args:
        test_id: ID of the test this bug is associated with
        title: Bug title
        description: Bug description
        severity: Bug severity (Critical, High, Medium, Low)
        url: URL to the bug
        status: Bug status (OPEN, FIXED, etc.)
        detected_at: Timestamp when the bug was detected (ISO format)
        screenshots: Optional list of screenshot URLs
    """
    data = {
        "title": title,
        "description": description,
        "test_id": test_id,
        "severity": severity,
        "url": url,
        "status": status,
        "detected_at": detected_at,
    }

    # Add screenshots if provided
    if screenshots:
        data["screenshots"] = screenshots

    response = requests.post(
        f"{BASE_URL}/bugs/",
        json=data,
    )

    if response.status_code != 200:
        raise RuntimeError(f"Received non-200 status code ({response.status_code}): {response.text}")
    return response.json()


def main() -> None:
    print("Creating product")
    product = create_product("Test Project", "This is a test product", "https://example.com", "This is a test documentation")

    print("Creating epic")
    epic = create_epic(product["id"], "Test Epic", "This is a test epic")

    print("Creating feature")
    feature = create_feature(epic["id"], "Test Feature", "This is a test feature", "https://example.com")

    print("Creating user story")
    user_story = create_user_story(feature["id"], "Test User Story", "This is a test user story")
    
    print("Creating acceptance criteria")
    acceptance_criteria = create_acceptance_criteria(user_story["id"], "Test Acceptance Criteria", "This is a test acceptance criteria")

    print("Creating test")
    test = create_test(acceptance_criteria["id"], "Test Test", "This is a test test", "UNIT", "PENDING", "https://example.com")

    print("Creating bug")
    bug = create_bug(test["id"], "Test Bug", "This is a test bug", "Low", "https://example.com", "OPEN", "2025-01-01")


if __name__ == "__main__":
    main()
