from fastapi import APIRouter
from .crypto import crypto_service


# Create a router for crypto operations
router = APIRouter(prefix="/crypto", tags=["crypto"])


@router.get("/public-key")
def get_public_key() -> dict:
    """
    Get the public key of the task manager for encryption purposes.

    Returns:
        dict: A dictionary containing the public key in PEM format and whether encryption is enabled
    """
    return crypto_service.get_public_key()
