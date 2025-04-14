from enum import Enum


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


def has_required_secrets(login_method: LoginMethod, secrets: dict[str, dict[str, str]]) -> tuple[bool, str | None]:
    if login_method.value not in secrets:
        return False, f"No secrets found for {login_method.name}"

    if not all(field in secrets[login_method.value] for field in REQUIRED_FIELDS[login_method.value]):
        return False, f"Missing required fields for {login_method.name}"

    return True, None
