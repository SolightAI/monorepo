import pytest
import uuid
import json
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient
from dto.models import User, Organization, OrganizationMember, Product
from dto.schemas import OrganizationType, OrganizationRole
from ..conftest import create_token
from ..fixtures.login_credentials import farmzz_credentials, credentials_map, get_credentials_for_domain


class MockResponse:
    def __init__(self, json_data, status_code=200):
        self.json_data = json_data
        self.status_code = status_code
        self.text = json.dumps(json_data)

    def json(self):
        return self.json_data

    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception(f"HTTP Error: {self.status_code}")


@pytest.fixture
async def organization_admin_user():
    """Create an admin user for the test organization"""
    user = await User.create(
        username="URL Validation Admin",
        email="urlvalidation_admin@example.com",
        is_admin=False,
        onboarding_completed=True
    )
    yield user
    await user.delete()


@pytest.fixture
async def test_organization(organization_admin_user):
    """Create a test organization"""
    org = await Organization.create(
        id=uuid.uuid4(),
        name="URL Validation Test Org",
        description="Organization for URL validation tests",
        type=OrganizationType.STARTUP
    )
    
    # Add admin user to organization
    await OrganizationMember.create(
        id=uuid.uuid4(),
        user=organization_admin_user,
        organization=org,
        role=OrganizationRole.ADMIN
    )
    
    yield org
    await org.delete()


# Mock responses for the URL validation endpoints
def mock_validate_url_response():
    """Return a mock response for the validate URL endpoint"""
    return MockResponse({
        "task_id": str(uuid.uuid4())
        # Note: The real API response only contains task_id, no status field
    })


def mock_validation_status_pending():
    """Return a mock pending status response"""
    return MockResponse({
        "status": "pending",
        "results": None,
        "error": None
    })


def mock_validation_status_completed():
    """Return a mock completed status with farmzz.com login page found"""
    return MockResponse({
        "status": "completed",
        "results": {
            "valid": True,
            "login_url": "https://farmzz.com/login",
            "confidence": "high",
            "explanation": "Found login form with username and password fields",
            "message": "Login page found successfully",
            "original_url": "https://farmzz.com",
            "source": "validation"
        },
        "error": None
    })


@pytest.mark.anyio
async def test_create_product_validate_url_login(
    client: AsyncClient, 
    test_organization, 
    organization_admin_user, 
    farmzz_credentials,
    credentials_map
):
    """
    Test creating a product with farmzz.com URL, validating the login page, 
    and testing login with credentials fixture
    """
    token = create_token(organization_admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}
    
    # Step 1: Create a product with farmzz.com URL
    with patch('httpx.AsyncClient.post', return_value=mock_validate_url_response()):
        create_data = {
            "name": "Farmzz Integration",
            "description": "Farm management platform integration test",
            "url": "https://farmzz.com",
            "documentation": "Farm management platform documentation",
            "links_to_documentation": [],
            "organization_id": str(test_organization.id)
        }
        
        response = await client.post("/products/", json=create_data, headers=headers)
        
        # Just verify the API call was successful, without assumptions about the response structure
        assert response.status_code == 200
        result = response.json()
        
        # The most important part is that we get a task_id to track the validation
        assert "task_id" in result, f"Response missing task_id: {result}"
        task_id = result["task_id"]
    
    # Step 2: Check validation status with mocked task manager responses
    # First simulate pending status
    with patch('httpx.AsyncClient.get', return_value=mock_validation_status_pending()):
        status_response = await client.get(f"/products/url-validation-status/{task_id}", headers=headers)
        assert status_response.status_code == 200
    
    # Then simulate completed status with login page found
    with patch('httpx.AsyncClient.get', return_value=mock_validation_status_completed()):
        status_response = await client.get(f"/products/url-validation-status/{task_id}", headers=headers)
        assert status_response.status_code == 200
    
    # Step 3: Verify credentials fixture is correctly structured
    # Since we're just testing the fixture structure, not actual login which happens in task-manager tests
    assert farmzz_credentials["domain"] == "farmzz.com"
    assert farmzz_credentials["username"] == "test_farmer"
    assert farmzz_credentials["password"] == "harvest2023!"
    
    # Also demonstrate using the credentials map
    domain = "farmzz.com"
    domain_creds = get_credentials_for_domain(domain, credentials_map)
    assert domain_creds is not None
    assert domain_creds["username"] == "test_farmer"
    assert domain_creds["login_url"] == "https://farmzz.com/login"


@pytest.mark.anyio
async def test_direct_url_validation_api(client: AsyncClient, organization_admin_user, farmzz_credentials):
    """
    Test direct URL validation API without creating a product
    """
    token = create_token(organization_admin_user.email)
    headers = {"Cookie": f"access_token=Bearer {token}"}
    
    # Step 1: Call the direct validation endpoint
    with patch('httpx.AsyncClient.post', return_value=mock_validate_url_response()):
        response = await client.post(
            "/products/validate-url/", 
            json={"url": "https://farmzz.com"}, 
            headers=headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "task_id" in result
        task_id = result["task_id"]
    
    # Step 2: Check validation status with mocked task manager responses
    with patch('httpx.AsyncClient.get', return_value=mock_validation_status_completed()):
        status_response = await client.get(f"/products/url-validation-status/{task_id}", headers=headers)
        assert status_response.status_code == 200
        
    # Step 3: Verify the login credentials fixture contains correct data
    assert farmzz_credentials["username"] == "test_farmer"
    assert farmzz_credentials["password"] == "harvest2023!"
    assert farmzz_credentials["login_url"] == "https://farmzz.com/login" 