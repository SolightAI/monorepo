from src.agents.utils.secrets import format_secrets


TEST_SECRETS = [
    {
        "category": "Email",
        "name": "Email",
        "values": {"username": "testuser@gmail.com", "password": "password123"},
    },
    {
        "category": "Google OAuth",
        "name": "Google OAuth Credentials",
        "values": {
            "username": "testuser@gmail.com",
            "password": "password123",
            "recovery_phone_number": "+11234567890",
        },
    },
]


def test_format_secrets() -> None:
    """Test formatting secrets."""
    formatted_secrets = format_secrets(TEST_SECRETS)

    assert formatted_secrets == {
        "Email:Email:username": "testuser@gmail.com",
        "Email:Email:password": "password123",
        "Google_OAuth:Google_OAuth_Credentials:username": "testuser@gmail.com",
        "Google_OAuth:Google_OAuth_Credentials:password": "password123",
        "Google_OAuth:Google_OAuth_Credentials:recovery_phone_number": "+11234567890",
    }


def test_format_secrets_names() -> None:
    """Test getting names from formatted secrets."""
    formatted_secrets = format_secrets(TEST_SECRETS)

    assert list(formatted_secrets.keys()) == [
        "Email:Email:username",
        "Email:Email:password",
        "Google_OAuth:Google_OAuth_Credentials:username",
        "Google_OAuth:Google_OAuth_Credentials:password",
        "Google_OAuth:Google_OAuth_Credentials:recovery_phone_number",
    ]
