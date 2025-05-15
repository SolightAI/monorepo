from typing import Any


def format_secrets(secrets: list[dict[str, Any]]) -> dict[str, str]:
    return {
        f"{_secret['category'].strip()}:{_secret['name'].strip()}:{secret_name.strip()}".strip().replace(" ", "_"): secret_value
        for _secret in secrets
        for secret_name, secret_value in _secret['values'].items()
    }
