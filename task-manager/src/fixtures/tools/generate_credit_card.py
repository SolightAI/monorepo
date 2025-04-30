from datetime import datetime
from logging import getLogger


logger = getLogger(__name__)


card_numbers_by_type = {
    "visa": "4242424242424242",
    "mastercard": "5555555555554444",
    "american_express": "378282246310005",
    "discover": "6011111111111117",
}

card_numbers_by_error_type = {
    "generic": "4000000000000002",
    "insufficient_funds": "4000000000009995",
    "lost_card": "4000000000009987",
    "stolen_card": "4000000000009979",
    "expired_card": "4000000000000069",
    "incorrect_cvc": "4000000000000127",
    "processing_error": "4000000000000119",
    "incorrect_number": "4242424242424241",
    "exceeding_velocity_limit": "4000000000006975",
}


def generate_credit_card(
    type: str = "visa",  # NOTE: we cannot use Literal here because it would crash browser-use at runtime
    error_type: str = "none",  # NOTE: we cannot use Literal here because it would crash browser-use at runtime
) -> str:
    """
    Generate credit card information based on the given type and error type.

    Args:
        type (Literal["visa", "mastercard", "american_express", "discover"]): The type of credit card to generate.
        error_type (Literal["none", "generic", "insufficient_funds", "lost_card", "stolen_card", "expired_card", "incorrect_cvc", "processing_error", "incorrect_number", "exceeding_velocity_limit"]): The type of error to generate, None for no error.

    Returns:
        str: A string containing the credit card information.
    """

    base_output = {
        "expiration_month": datetime.now().month,
        "expiration_year": datetime.now().year + 1,
        "cvv": "123",
    }

    if type not in card_numbers_by_type:
        raise ValueError(f"Invalid credit card type. Expected one of {card_numbers_by_type.keys()}")

    if error_type is not None and error_type != "none" and error_type not in card_numbers_by_error_type:
        raise ValueError(f"Invalid error type. Expected one of {card_numbers_by_error_type.keys()}")

    base_output["number"] = card_numbers_by_type[type]

    if error_type and error_type != "none":
        base_output["number"] = card_numbers_by_error_type[error_type]

    credit_card_info = "\n".join(f"{k}: {v}" for (k, v) in base_output.items())

    logger.info(f"Generated credit card information: {credit_card_info}")

    return credit_card_info  # NOTE: we cannot return a dict here because it would crash browser-use at runtime


if __name__ == "__main__":
    print(generate_credit_card("visa"))
