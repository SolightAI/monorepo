import uuid


def generate_uuid() -> str:
    """
    Generate and return a random UUID.
    """

    return str(uuid.uuid4())
