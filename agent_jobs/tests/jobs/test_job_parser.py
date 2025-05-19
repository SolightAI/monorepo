import pytest

from pydantic import ValidationError

from src.job_parser import parse_job
  
  
@pytest.mark.asyncio
async def test_parse_validate_url_job() -> None:
    """Test parsing a validate_url job."""
    payload = {
        "job_type": "validate_url",
        "job_id": "1234567890",
        "payload": {
            "url": "https://tickpick_dev:tickpick.1@dev.tickpick.com/"
        }
    }

    job = parse_job(payload)

    assert job.job_type == "validate_url"
    assert job.job_id == "1234567890"
    assert job.payload.url == "https://tickpick_dev:tickpick.1@dev.tickpick.com/"

@pytest.mark.asyncio
async def test_parse_generate_tests_job() -> None:
    """Test parsing a generate_tests job."""
    payload = {
        "job_type": "generate_tests",
        "job_id": "1234567890",
        "payload": {
            "product": {
                "url": "https://tickpick_dev:tickpick.1@dev.tickpick.com/",
                "name": "Tick Pick",
                "description": "Tick Pick is a web-based ticketing system that allows users to book tickets for events, meetings, and other activities.",
                "documentation": "https://tickpick.com/docs",
                "links_to_documentation": [
                    "https://tickpick.com/docs/getting-started",
                    "https://tickpick.com/docs/user-guide",
                    "https://tickpick.com/docs/api-reference"
                ]
            },
            "epic": {
                "name": "Tick Pick",
                "description": "Tick Pick is a web-based ticketing system that allows users to book tickets for events, meetings, and other activities."
            },
            "feature": {
                "id": "1234567890",
                "urls": [
                    "https://tickpick_dev:tickpick.1@dev.tickpick.com/",
                    "https://tickpick_dev:tickpick.1@dev.tickpick.com/checkout?listingId=889809947&quantity=1&listingType=TEVO&price=96&dt=f&dv=2&e=7089570&s=123&r=14"
                ],
                "name": "Tick Pick",
                "description": "Tick Pick is a web-based ticketing system that allows users to book tickets for events, meetings, and other activities.",
                "access_conditions": {
                    "must_be_logged_in": True
                },
                "dependents": [
                    {
                        "id": "1234567890",
                        "urls": [
                            "https://tickpick_dev:tickpick.1@dev.tickpick.com/",
                            "https://tickpick_dev:tickpick.1@dev.tickpick.com/checkout?listingId=889809947&quantity=1&listingType=TEVO&price=96&dt=f&dv=2&e=7089570&s=123&r=14"
                        ],
                        "name": "Tick Pick",
                        "description": "Tick Pick is a web-based ticketing system that allows users to book tickets for events, meetings, and other activities.",
                        "access_conditions": {
                            "must_be_logged_in": True
                        },
                        "dependents": [],
                        "dependencies": []
                    }
                ],
                "dependencies": []
            },
            "secrets": [
                {
                    "name": "Credentials",
                    "category": "EMAIL",
                    "values": {
                        "username": "testuser",
                        "password": "password123"
                    }
                }
            ],
            "categories": [
                "SMOKE",
                "UNIT"
            ]
        }
    }

    job = parse_job(payload)

    assert job.job_type == "generate_tests"
    assert job.job_id == "1234567890"
    assert job.payload.product.url == "https://tickpick_dev:tickpick.1@dev.tickpick.com/"
    assert job.payload.product.name == "Tick Pick"
    assert job.payload.product.description == "Tick Pick is a web-based ticketing system that allows users to book tickets for events, meetings, and other activities."
    assert job.payload.product.documentation == "https://tickpick.com/docs"
    assert job.payload.categories == [
        "SMOKE",
        "UNIT"
    ]
    
@pytest.mark.asyncio
async def test_parse_run_test_job() -> None:
    """Test parsing a run_test job."""
    payload = {
        "job_type": "run_test",
        "job_id": "1234567890",
        "payload": {
            "product": {
                "url": "https://tickpick_dev:tickpick.1@dev.tickpick.com/",
                "name": "Tick Pick",
                "description": "Tick Pick is a web-based ticketing system that allows users to book tickets for events, meetings, and other activities.",
                "links_to_documentation": [],
                "documentation": ""
            },
            "feature": {
              "urls": [],
              "name": "Tick Pick",
              "description": "Tick Pick is a web-based ticketing system that allows users to book tickets for events, meetings, and other activities.",
              "access_conditions": {
                  "must_be_logged_in": True
              },
              "dependents": [],
              "dependencies": []
            },
            "test": {
              "name": "Verify Sign Up with Email",
              "description": "Test the ability of a user to sign up using the Email method.",
              "url": "",
              "category": "SMOKE",
              "preconditions": "",
              "steps": "1. Locate and select the 'Sign Up with Email' option.\n2. Enter a valid email address in the 'Email' field.\n3. Re-enter the same email address in the 'Confirm Email' field.\n4. Enter a valid password (minimum 7 characters) in the 'Password' field.\n5. Submit the form.",
              "assertions": "The user is successfully signed up",
              "feature_id": "1234567890"
            },
            "secrets": [],
            "run_with_cache": True
        }
    }

    job = parse_job(payload)

    assert job.job_type == "run_test"
    assert job.job_id == "1234567890"
    assert job.payload.product.name == "Tick Pick"

    
@pytest.mark.asyncio
async def test_parse_improve_test_steps_job() -> None:
    """Test parsing a improve_test_steps job."""
    payload = {
        "job_type": "improve_test_steps",
        "job_id": "1234567890",
        "payload": {
            "product": {
                "url": "https://tickpick_dev:tickpick.1@dev.tickpick.com/",
                "name": "Tick Pick",
                "description": "Tick Pick is a web-based ticketing system that allows users to book tickets for events, meetings, and other activities.",
                "documentation": "https://tickpick.com/docs",
                "links_to_documentation": [
                    "https://tickpick.com/docs/getting-started",
                    "https://tickpick.com/docs/user-guide",
                    "https://tickpick.com/docs/api-reference"
                ]
            },
            "test": {
                "category": "SMOKE",
                "name": "Verify Sign Up with Email",
                "url": "https://tickpick_dev:tickpick.1@dev.tickpick.com/",
                "description": "Test the ability of a user to sign up using the Email method.",
                "steps": "1. Locate and select the 'Sign Up with Email' option.\n2. Enter a valid email address in the 'Email' field.\n3. Re-enter the same email address in the 'Confirm Email' field.\n4. Enter a valid password (minimum 7 characters) in the 'Password' field.\n5. Submit the form.",
                "preconditions": "",
                "assertions": "The user is successfully signed up",
                "feature_id": "1234567890"
            },
            "secrets": [
                {
                    "name": "Credentials",
                    "category": "EMAIL",
                    "values": {
                        "username": "testuser",
                        "password": "password123"
                    }
                }
            ]
        }
    }

    job = parse_job(payload)

    assert job.job_type == "improve_test_steps"
    assert job.job_id == "1234567890"
    assert job.payload.product.url == "https://tickpick_dev:tickpick.1@dev.tickpick.com/"
    assert job.payload.product.name == "Tick Pick"
    assert job.payload.product.documentation == "https://tickpick.com/docs"
    assert job.payload.test.category == "SMOKE"
    assert job.payload.test.name == "Verify Sign Up with Email"

    
@pytest.mark.asyncio
async def test_unknown_job_type() -> None:
    """Test parsing an unknown job type."""
    payload = {
        "job_type": "unknown_job_type",
        "job_id": "1234567890",
        "payload": {}
    }
    
    try:
        parse_job(payload)
        pytest.fail("ValidationError not raised")
    except ValidationError:
        assert True