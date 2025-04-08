"""
Fixtures for login credentials to various test applications.
This module provides credentials fixtures that can be used across tests.
"""

import pytest


@pytest.fixture
def farmzz_credentials():
    """
    Test credentials for farmzz.com login page.
    For testing purposes only, not real credentials.
    """
    return {
        "username": "test_farmer",
        "password": "harvest2023!",
        "remember_me": True,
        "domain": "farmzz.com",
        "login_url": "https://farmzz.com/login"
    }


@pytest.fixture
def credentials_map():
    """
    Map of domains to their login credentials.
    Can be used to dynamically select credentials based on domain.
    """
    return {
        "farmzz.com": {
            "username": "test_farmer",
            "password": "harvest2023!",
            "remember_me": True,
            "login_url": "https://farmzz.com/login"
        },
        "example.com": {
            "username": "test_user",
            "password": "example123!",
            "remember_me": False,
            "login_url": "https://example.com/auth/login"
        }
    }


def get_credentials_for_domain(domain, credentials_map_fixture):
    """
    Helper function to get credentials for a specific domain.
    
    Args:
        domain: The domain to get credentials for
        credentials_map_fixture: The credentials_map fixture
        
    Returns:
        Credentials dict or None if domain not found
    """
    return credentials_map_fixture.get(domain) 