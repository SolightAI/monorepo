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


def create_test(user_story_id: str, name: str, description: str, category: str, status: str, severity: str, url: str) -> None:
    response = requests.post(f"{BASE_URL}/tests/", json={"name": name, "description": description, "user_story_id": user_story_id, "category": category, "status": status, "severity": severity, "url": url})

    if response.status_code != 200:
        raise RuntimeError(f"Received non-200 status code ({response.status_code}): {response.text}")
    return response.json()


def create_bug(test_id: str, title: str, description: str, severity: str, url: str, status: str, detected_at: str) -> None:
    response = requests.post(
        f"{BASE_URL}/bugs/",
        json={
            "title": title,
            "description": description,
            "test_id": test_id,
            "severity": severity,
            "url": url,
            "status": status,
            "detected_at": detected_at,
            # "screenshots": [], # TODO
        },
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

    print("Creating test")
    test = create_test(user_story["id"], "Test Test", "This is a test test", "UNIT", "PENDING", "LOW", "https://example.com")

    print("Creating bug")
    bug = create_bug(test["id"], "Test Bug", "This is a test bug", "Low", "https://example.com", "OPEN", "2025-01-01")


if __name__ == "__main__":
    main()
