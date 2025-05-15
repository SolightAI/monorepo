import base64
import logging

from typing import Optional, Any
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


# Configure logging
logger = logging.getLogger(__name__)


class CryptoService:
    """Service for symmetric encryption/decryption using AES-GCM."""

    def __init__(self, symmetric_encryption_key: str) -> None:
        """Initialize the crypto service."""
        self.key: Optional[bytes] = None
        self.key_loaded = False

        try:
            # Expecting a base64 encoded key
            self.key = base64.urlsafe_b64decode(symmetric_encryption_key)
            # AES-256 requires a 32-byte key
            if len(self.key) != 32:
                logger.error(
                    f"Invalid key length: {len(self.key)} bytes. Expected 32 bytes for AES-256."
                )
                self.key = None
                return
            self.key_loaded = True
            logger.info("Successfully loaded symmetric encryption key.")
        except Exception as e:
            logger.error(f"Failed to decode SYMMETRIC_ENCRYPTION_KEY: {str(e)}")
            self.key = None

    def ensure_initialized(self) -> bool:
        """
        Ensure the service is initialized with a symmetric key if possible.

        Returns:
            bool: True if initialized, False otherwise
        """
        return self.key is not None

    def decrypt(self, encrypted_value_b64: str) -> str:
        """
        Decrypt a value using AES-GCM.

        Args:
            encrypted_value_b64: Base64-encoded encrypted value (nonce prepended)

        Returns:
            The decrypted value as a string

        Raises:
            ValueError: If the value cannot be decrypted (e.g., invalid key, bad format, authentication tag mismatch)
        """
        if not self.ensure_initialized() or self.key is None:
            raise ValueError("Symmetric key is not available for decryption.")

        if not encrypted_value_b64:
            logger.warning("Attempted to decrypt an empty value.")
            return ""

        try:
            # Decode from base64
            encrypted_data_with_nonce = base64.urlsafe_b64decode(encrypted_value_b64)

            # Extract nonce (first 12 bytes) and ciphertext
            nonce = encrypted_data_with_nonce[:12]
            ciphertext = encrypted_data_with_nonce[12:]

            if len(nonce) != 12:
                raise ValueError("Invalid nonce length found during decryption.")

            # Decrypt using the key and nonce
            aesgcm = AESGCM(self.key)
            decrypted_data = aesgcm.decrypt(nonce, ciphertext, None)

            # Return the decrypted value as a UTF-8 string
            return decrypted_data.decode("utf-8")
        except Exception as e:
            logger.error(f"Error decrypting value: {type(e).__name__} - {e}")
            # Re-raise as ValueError to signal decryption failure
            raise ValueError(f"Decryption failed: {e}") from e

    def decrypt_secrets(
        self, encrypted_secrets: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """
        Decrypt a dictionary of encrypted secrets using AES-GCM.

        Args:
            encrypted_secrets: Dictionary mapping secret types to dictionaries of encrypted key-value pairs

        Returns:
            Dictionary of decrypted secrets with the same structure

        Raises:
             ValueError: If decryption fails for any secret value
        """

        if not encrypted_secrets:
            return list()

        if not self.ensure_initialized():
            raise ValueError(
                "Cannot decrypt secrets because symmetric key is unavailable."
            )

        decrypted_secrets: list[dict[str, Any]] = list()

        for secret in encrypted_secrets:
            decrypted_secrets.append(
                {
                    "category": secret["category"],
                    "name": secret["name"],
                    "values": {
                        key: self.decrypt(value)
                        for key, value in secret["values"].items()
                    },
                }
            )

        return decrypted_secrets
