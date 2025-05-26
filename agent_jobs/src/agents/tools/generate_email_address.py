import uuid

from faker import Faker


def generate_plus_addressing_email_address(email: str) -> str:
    """
    Generate and return a new email address from the provided one using "plus addressing" (i.e my@solight-email.com -> my+uuid@solight-email.com).

    Args:
        email (str): The email address to generate a new one from. (i.e my@solight-email.com)

    Returns:
        str: The new email address. (i.e my+uuid@solight-email.com)

    Raises:
        ValueError: If the email is invalid.
    """

    if "@" not in email:
        raise ValueError("Invalid email (no @ found)")

    if "+" in email:
        raise ValueError("Email already has a plus addressing")

    return f"{email.split('@')[0]}+{str(uuid.uuid4())}@{email.split('@')[1]}"


def generate_random_email_address() -> str:
    """
    Generate and return a new random email address (i.e uuid@solight-email.com).

    Returns:
        str: The new email address. (i.e uuid@solight-email.com)
    """

    fake = Faker()

    random_id = str(uuid.uuid4())[:3]  # limit the risk of collision

    email = fake.email(domain="solight-email.com")

    return email.replace("@", f"{random_id}@")


if __name__ == "__main__":
    print(generate_plus_addressing_email_address("test@solight-email.com"))
    print(generate_random_email_address())
