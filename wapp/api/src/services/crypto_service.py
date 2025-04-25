import os
import base64
import logging
import threading
from typing import Dict, Optional, Tuple

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


# Configure logging
logger = logging.getLogger(__name__)


class CryptoService:
    """
    Service for symmetric encryption/decryption using AES-GCM.
    Uses a shared key provided via environment variable.
    """

    def __init__(self) -> None:
        """Initialize the crypto service."""
        self.key: Optional[bytes] = None
        self.key_loaded = False
        self.lock = threading.RLock()

        # Load the symmetric key from environment
        self._load_key()

        # Keep task_manager_url for potential future use, but remove related logic
        self.task_manager_url = os.getenv("TASK_MANAGER_URL")

    def _load_key(self) -> None:
        """Load the symmetric encryption key from the environment."""
        with self.lock:
            if self.key_loaded:
                return

            key_b64 = os.getenv("SYMMETRIC_ENCRYPTION_KEY")
            if not key_b64:
                logger.warning("SYMMETRIC_ENCRYPTION_KEY environment variable is not set. Encryption will not work.")
                return

            try:
                # Expecting a base64 encoded key
                self.key = base64.urlsafe_b64decode(key_b64)
                # AES-256 requires a 32-byte key
                if len(self.key) != 32:
                    logger.error(f"Invalid key length: {len(self.key)} bytes. Expected 32 bytes for AES-256.")
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
        if not self.key_loaded:
            self._load_key()  # Attempt to load if not already loaded
        return self.key is not None

    def encrypt(self, value: str) -> Optional[str]:
        """
        Encrypt a value using AES-GCM.

        Args:
            value: The value to encrypt

        Returns:
            The encrypted value as a base64-encoded string (nonce prepended), or None if encryption fails
        """
        if not value:
            logger.debug("Cannot encrypt empty value.")  # Changed to debug as this might be expected
            return None

        if not self.ensure_initialized() or self.key is None:
            logger.error("Cannot encrypt value because symmetric key is unavailable.")  # Changed to error
            return None

        try:
            aesgcm = AESGCM(self.key)
            # Generate a random 12-byte nonce
            nonce = os.urandom(12)
            # Encrypt the value (encode to bytes first)
            encrypted_data = aesgcm.encrypt(nonce, value.encode('utf-8'), None)
            # Prepend nonce to the ciphertext and encode in base64
            return base64.urlsafe_b64encode(nonce + encrypted_data).decode('ascii')
        except Exception as e:
            logger.error(f"Error encrypting value: {type(e).__name__} - {e}")
            return None

    def encrypt_secrets(self, secrets: Dict[str, Dict[str, str]]) -> Tuple[bool, Optional[Dict[str, Dict[str, str]]]]:
        """
        Encrypt a dictionary of secrets using AES-GCM.

        Args:
            secrets: Dictionary mapping secret types to dictionaries of key-value pairs

        Returns:
            A tuple of (success, encrypted_secrets)
            - success: True if encryption was successful or not needed, False otherwise
            - encrypted_secrets: Dictionary of encrypted secrets, or None if encryption was not performed or failed
        """
        if not secrets:
            return True, None  # No secrets to encrypt

        if not self.ensure_initialized():
            logger.error("Cannot encrypt secrets because symmetric key is unavailable.")
            return False, None

        encrypted_secrets: Dict[str, Dict[str, str]] = {}
        all_successful = True

        try:
            for secret_type, secret_values in secrets.items():
                encrypted_secrets[secret_type] = {}

                for key, value in secret_values.items():
                    encrypted_value = self.encrypt(value)
                    if encrypted_value is None:
                        logger.error(f"Failed to encrypt secret {secret_type}.{key}")
                        all_successful = False
                        # Continue encrypting others, but mark the overall operation as failed
                        encrypted_secrets[secret_type][key] = "ENCRYPTION_FAILED"  # Placeholder or handle as needed
                    else:
                        encrypted_secrets[secret_type][key] = encrypted_value

            if not all_successful:
                logger.error("Encryption failed for one or more secrets.")
                return False, None  # Return None as the dict contains placeholders/errors

            return True, encrypted_secrets
        except Exception as e:
            logger.error(f"Error encrypting secrets dictionary: {str(e)}")
            return False, None

    def can_encrypt(self) -> bool:
        """
        Check if encryption is available and configured (i.e., key is loaded).

        Returns:
            bool: True if encryption is possible, False otherwise
        """
        return self.ensure_initialized()


# Create a singleton instance for use throughout the application
crypto_service = CryptoService()
