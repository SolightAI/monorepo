import string
import random


def generate_password(
    length: int = 10,
    small_letters: bool = True,
    capital_letters: bool = True,
    numbers: bool = True,
    special_characters: bool = True,
) -> str:
    """
    Generate a random password with the given criteria.

    Args:
        length (int): The length of the password.
        small_letters (bool): Whether to include at least one small letter.
        capital_letters (bool): Whether to include at least one capital letter.
        numbers (bool): Whether to include at least one number.
        special_characters (bool): Whether to include at least one special character.

    Returns:
        str: The generated password.
    """

    if not small_letters and not capital_letters and not numbers and not special_characters:
        raise ValueError("At least one character type must be included")

    if length < 8:
        raise ValueError("Password length must be at least 8 characters")

    password = ""
    characters = ""

    if small_letters:
        password += random.choice(string.ascii_lowercase)
        characters += string.ascii_lowercase
    if capital_letters:
        password += random.choice(string.ascii_uppercase)
        characters += string.ascii_uppercase
    if numbers:
        password += random.choice(string.digits)
        characters += string.digits
    if special_characters:
        password += random.choice(string.punctuation)
        characters += string.punctuation

    for _ in range(length - len(password)):
        password += random.choice(characters)

    return password
