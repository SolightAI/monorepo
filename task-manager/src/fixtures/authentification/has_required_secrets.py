from enum import Enum
from typing import Any


class LoginMethod(str, Enum):
    """
    Enum of all possible login methods.
    """
    ANY = "any"
    EMAIL = "username_password"
    INSTANT_LOGIN = "instant_login"
    GOOGLE = "oauth_credential_google"
    FACEBOOK = "oauth_credential_facebook"
    APPLE = "oauth_credential_apple"
    TWITTER = "oauth_credential_twitter"
    OTHER = "other"


SUPPORTED_LOGIN_METHODS = [LoginMethod.ANY, LoginMethod.EMAIL]


REQUIRED_FIELDS = {
    LoginMethod.EMAIL.value: ["username", "password"],
    LoginMethod.GOOGLE.value: ["username", "password"],
}


def has_required_secrets(login_method: LoginMethod, secrets: list[dict[str, Any]]) -> tuple[bool, str | None]:

    if login_method.value not in [secret['category'] for secret in secrets]:
        return False, f"No secrets found for {login_method.name}"

    for secret in secrets:
        if secret['category'] == login_method.value:
            if not all(field in secret['values'] for field in REQUIRED_FIELDS[login_method.value]):
                return False, f"Missing required fields ({', '.join(REQUIRED_FIELDS[login_method.value])}) for {login_method.name}. Found: {', '.join(secret['values'].keys())}"

    # if not all(field in [ secret['values'] for secret in secrets if secret['category'] == login_method.value] for field in REQUIRED_FIELDS[login_method.value]):
    #     return False, f"Missing required fields ({', '.join(REQUIRED_FIELDS[login_method.value])}) for {login_method.name}. Found: {', '.join([secret['values'] for secret in secrets if secret['category'] == login_method.value])}"

    return True, None
