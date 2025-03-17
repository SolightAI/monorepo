import os
import base64
from typing import Optional, Tuple
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


class EncryptionService:
    """Service for encrypting and decrypting secret values."""

    def __init__(self, encryption_key: Optional[str] = None):
        """
        Initialize the encryption service with a key.

        Args:
            encryption_key: The key to use for encryption, or None to use the environment variable.
        """
        # Get encryption key from environment if not provided
        self.encryption_key = encryption_key or os.getenv("SECRET_ENCRYPTION_KEY")

        if not self.encryption_key:
            raise ValueError("Encryption key is required. Set SECRET_ENCRYPTION_KEY environment variable.")

        # Derive a key from the provided encryption key
        self.fernet = self._create_fernet_instance(self.encryption_key)

    def _create_fernet_instance(self, key: str) -> Fernet:
        """
        Create a Fernet instance from a key.

        Args:
            key: The key to use

        Returns:
            A Fernet instance for encryption/decryption
        """
        # Derive a key using PBKDF2
        salt = os.getenv("SECRET_ENCRYPTION_SALT", "default_salt").encode()
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        derived_key = base64.urlsafe_b64encode(kdf.derive(key.encode()))
        return Fernet(derived_key)

    def encrypt(self, value: str) -> str:
        """
        Encrypt a value.

        Args:
            value: The value to encrypt

        Returns:
            The encrypted value as a string
        """
        if not value:
            return ""

        encrypted_data = self.fernet.encrypt(value.encode())
        return base64.urlsafe_b64encode(encrypted_data).decode()

    def decrypt(self, encrypted_value: str) -> str:
        """
        Decrypt a value.

        Args:
            encrypted_value: The encrypted value to decrypt

        Returns:
            The decrypted value
        """
        if not encrypted_value:
            return ""

        try:
            decoded_data = base64.urlsafe_b64decode(encrypted_value.encode())
            decrypted_data = self.fernet.decrypt(decoded_data)
            return decrypted_data.decode()
        except Exception as e:
            # Log the error but don't expose details in the exception
            print(f"Error decrypting value: {type(e).__name__}")
            raise ValueError("Could not decrypt the value") from e


# Create a singleton instance for use throughout the application
encryption_service = EncryptionService()


def generate_encryption_key() -> Tuple[str, str]:
    """
    Generate a new encryption key and salt.

    Returns:
        A tuple of (key, salt) for encryption
    """
    key = base64.urlsafe_b64encode(os.urandom(32)).decode()
    salt = base64.urlsafe_b64encode(os.urandom(16)).decode()
    return key, salt
