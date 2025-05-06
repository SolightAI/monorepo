from enum import Enum
from typing import Any


class LoginMethod(str, Enum):
    """
    Enum of all possible login methods.
    """
    ANY = "any"
    EMAIL = "username_password"
    OAUTH_CREDENTIAL = "oauth_credential"


SUPPORTED_LOGIN_METHODS = [LoginMethod.ANY, LoginMethod.EMAIL, LoginMethod.OAUTH_CREDENTIAL]


REQUIRED_FIELDS = {
    LoginMethod.EMAIL.value: ["username", "password"],
    LoginMethod.OAUTH_CREDENTIAL.value: ["provider", "username", "password"],
}


def has_required_secrets(login_method: LoginMethod, secrets: list[dict[str, Any]]) -> tuple[bool, str | None]:

    # Filter secrets matching the login method category
    matching_secrets = [s for s in secrets if s.get('category') == login_method.value]

    if not matching_secrets:
        return False, f"No secrets found for {login_method.name}"

    # Check if this login method has defined required fields
    if login_method.value not in REQUIRED_FIELDS:
        # If no fields are defined as required, finding a matching category is enough
        return True, None

    required_fields = REQUIRED_FIELDS[login_method.value]

    # Check if any matching secret contains all required fields
    for secret in matching_secrets:
        secret_values = secret.get('values', {})
        if all(field in secret_values for field in required_fields):
            # Found at least one secret with all required fields
            return True, None

    # If loop completes, none of the matching secrets had all required fields
    # Construct a helpful error message showing required vs found fields across all matching secrets
    fields_found = set()
    for secret in matching_secrets:
        fields_found.update(secret.get('values', {}).keys())

    return False, f"No secret for {login_method.name}"
