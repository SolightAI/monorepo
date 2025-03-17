import requests


BASE_URL = "http://localhost:8000"


def create_product(name: str, description: str, url: str, documentation: str, links_to_documentation: list | None = None) -> dict:
    if links_to_documentation is None:
        links_to_documentation = []
    # Ensure each link has name and url properties
    for link in links_to_documentation:
        if not isinstance(link, dict) or "name" not in link or "url" not in link:
            raise ValueError("Each link in links_to_documentation must be a dictionary with 'name' and 'url' keys")
    response = requests.post(f"{BASE_URL}/products/", json={"name": name, "description": description, "url": url, "documentation": documentation, "links_to_documentation": links_to_documentation})

    if response.status_code != 200:
        raise RuntimeError(f"Received non-200 status code ({response.status_code}): {response.text}")
    return response.json()


def create_epic(product_id: str, name: str, description: str) -> dict:
    response = requests.post(f"{BASE_URL}/epics/", json={"name": name, "description": description, "product_id": product_id})

    if response.status_code != 200:
        raise RuntimeError(f"Received non-200 status code ({response.status_code}): {response.text}")
    return response.json()


def create_feature(epic_id: str, name: str, description: str, url: str) -> dict:
    response = requests.post(f"{BASE_URL}/features/", json={"name": name, "description": description, "epic_id": epic_id, "urls": [url]})

    if response.status_code != 200:
        raise RuntimeError(f"Received non-200 status code ({response.status_code}): {response.text}")
    return response.json()


def create_user_story(feature_id: str, name: str, description: str) -> dict:
    response = requests.post(f"{BASE_URL}/user-stories/", json={"name": name, "description": description, "feature_id": feature_id})

    if response.status_code != 200:
        raise RuntimeError(f"Received non-200 status code ({response.status_code}): {response.text}")
    return response.json()


def create_acceptance_criteria(user_story_id: str, name: str, description: str) -> dict:
    """Create acceptance criteria for a user story.

    Args:
        user_story_id: ID of the user story this acceptance criteria is associated with
        name: Acceptance criteria name
        description: Acceptance criteria description
    """
    response = requests.post(f"{BASE_URL}/acceptance-criteria/", json={"name": name, "description": description, "user_story_id": user_story_id})

    if response.status_code != 200:
        raise RuntimeError(f"Received non-200 status code ({response.status_code}): {response.text}")
    return response.json()


def create_test(acceptance_criteria_id: str, name: str, description: str, category: str, status: str, url: str) -> dict:
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


def create_bug(test_id: str, name: str, description: str, severity: str, url: str, status: str, detected_at: str, screenshots: list[str] | None = None) -> dict:
    """Create a bug in the database.

    Args:
        test_id: ID of the test this bug is associated with
        name: Bug name
        description: Bug description
        severity: Bug severity (Critical, High, Medium, Low)
        url: URL to the bug
        status: Bug status (OPEN, FIXED, etc.)
        detected_at: Timestamp when the bug was detected (ISO format)
        screenshots: Optional list of screenshot URLs
    """
    # Use a type annotation to indicate this is a dict that can hold various types
    data: dict[str, object] = {
        "name": name,
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


def update_epic(epic_id: str, name: str | None = None, description: str | None = None) -> dict:
    """Update an epic with the provided data.

    Args:
        epic_id: ID of the epic to update
        name: New name for the epic (optional)
        description: New description for the epic (optional)
    """
    # Only include provided fields in the update data
    update_data = {}
    if name is not None:
        update_data["name"] = name
    if description is not None:
        update_data["description"] = description

    response = requests.put(f"{BASE_URL}/epics/{epic_id}", json=update_data)

    if response.status_code != 200:
        raise RuntimeError(f"Received non-200 status code ({response.status_code}): {response.text}")
    return response.json()


def update_feature(feature_id: str, name: str | None = None, description: str | None = None, urls: list[str] | None = None) -> dict:
    """Update a feature with the provided data.

    Args:
        feature_id: ID of the feature to update
        name: New name for the feature (optional)
        description: New description for the feature (optional)
        urls: New list of URLs for the feature (optional)
    """
    # Only include provided fields in the update data
    update_data: dict[str, object] = {}
    if name is not None:
        update_data["name"] = name
    if description is not None:
        update_data["description"] = description
    if urls is not None:
        update_data["urls"] = urls

    response = requests.put(f"{BASE_URL}/features/{feature_id}", json=update_data)

    if response.status_code != 200:
        raise RuntimeError(f"Received non-200 status code ({response.status_code}): {response.text}")
    return response.json()


def update_user_story(user_story_id: str, name: str | None = None, description: str | None = None) -> dict:
    """Update a user story with the provided data.

    Args:
        user_story_id: ID of the user story to update
        name: New name for the user story (optional)
        description: New description for the user story (optional)
    """
    # Only include provided fields in the update data
    update_data = {}
    if name is not None:
        update_data["name"] = name
    if description is not None:
        update_data["description"] = description

    response = requests.put(f"{BASE_URL}/user-stories/{user_story_id}", json=update_data)

    if response.status_code != 200:
        raise RuntimeError(f"Received non-200 status code ({response.status_code}): {response.text}")
    return response.json()


def update_acceptance_criteria(acceptance_criteria_id: str, name: str | None = None, description: str | None = None) -> dict:
    """Update acceptance criteria with the provided data.

    Args:
        acceptance_criteria_id: ID of the acceptance criteria to update
        name: New name for the acceptance criteria (optional)
        description: New description for the acceptance criteria (optional)
    """
    # Only include provided fields in the update data
    update_data = {}
    if name is not None:
        update_data["name"] = name
    if description is not None:
        update_data["description"] = description

    response = requests.put(f"{BASE_URL}/acceptance-criteria/{acceptance_criteria_id}", json=update_data)

    if response.status_code != 200:
        raise RuntimeError(f"Received non-200 status code ({response.status_code}): {response.text}")
    return response.json()


def update_test(test_id: str, name: str | None = None, description: str | None = None, url: str | None = None, category: str | None = None, status: str | None = None) -> dict:
    """Update a test with the provided data.

    Args:
        test_id: ID of the test to update
        name: New name for the test (optional)
        description: New description for the test (optional)
        url: New URL for the test (optional)
        category: New category for the test (SMOKE, FUNCTIONAL, END_TO_END, UNIT, etc.) (optional)
        status: New status for the test (NOT_STARTED, PENDING, PASSED, FAILED, etc.) (optional)
    """
    # Only include provided fields in the update data
    update_data = {}
    if name is not None:
        update_data["name"] = name
    if description is not None:
        update_data["description"] = description
    if url is not None:
        update_data["url"] = url
    if category is not None:
        update_data["category"] = category
    if status is not None:
        update_data["status"] = status

    response = requests.put(f"{BASE_URL}/tests/{test_id}", json=update_data)

    if response.status_code != 200:
        raise RuntimeError(f"Received non-200 status code ({response.status_code}): {response.text}")
    return response.json()


def main() -> None:
    print("Creating product")
    product = create_product(
        "Test Project",
        "This is a test product",
        "https://example.com",
        "This is a test documentation",
        links_to_documentation=[
            {"name": "API Documentation", "url": "https://example.com/api-docs"},
            {"name": "User Guide", "url": "https://example.com/user-guide"}
        ]
    )

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
    create_bug(test["id"], "Test Bug", "This is a test bug", "Low", "https://example.com", "OPEN", "2025-01-01")

    print("\nUpdating entities using PUT methods:")
    print("Updating epic")
    updated_epic = update_epic(epic["id"], name="Updated Epic Name", description="Updated epic description")
    print(f"Epic updated: {updated_epic['name']}")

    print("Updating feature")
    updated_feature = update_feature(feature["id"], name="Updated Feature Name", description="Updated feature description")
    print(f"Feature updated: {updated_feature['name']}")

    print("Updating user story")
    updated_user_story = update_user_story(user_story["id"], name="Updated User Story Title", description="Updated user story description")
    print(f"User story updated: {updated_user_story['name']}")

    print("Updating acceptance criteria")
    updated_acceptance_criteria = update_acceptance_criteria(acceptance_criteria["id"], name="Updated Acceptance Criteria Title", description="Updated acceptance criteria description")
    print(f"Acceptance criteria updated: {updated_acceptance_criteria['name']}")

    print("Updating test")
    updated_test = update_test(test["id"], name="Updated Test Name", description="Updated test description", status="PASSED")
    print(f"Test updated: {updated_test['name']} (Status: {updated_test['status']})")


if __name__ == "__main__":
    main()
