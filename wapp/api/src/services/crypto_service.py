import os
import time
import base64
import logging
import requests
import threading
from typing import Dict, Optional, Tuple

from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.serialization import load_pem_public_key
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import UnsupportedAlgorithm


# Configure logging
logger = logging.getLogger(__name__)


class CryptoService:
    """
    Service for encrypting secrets for transmission to task-manager.
    Uses the task-manager's public key for asymmetric encryption.
    """

    def __init__(self):
        """Initialize the crypto service."""
        self.public_key = None
        self.public_key_pem = None
        self.last_refresh_time = 0
        self.refresh_interval = 0  # no interval, we refresh the key on every request
        self.lock = threading.RLock()

        # URL of the task manager
        self.task_manager_url = os.getenv("TASK_MANAGER_URL")
        if not self.task_manager_url:
            logger.warning("TASK_MANAGER_URL is not set. Encryption to task-manager will not work.")

        # Fetch the public key on initialization
        self.refresh_public_key()

    def refresh_public_key(self) -> bool:
        """
        Fetch the public key from the task-manager.

        Returns:
            bool: True if the key was refreshed successfully, False otherwise
        """
        with self.lock:

            if not self.task_manager_url:
                raise ValueError("TASK_MANAGER_URL is not set. Encryption to task-manager will not work.")

            # Skip if the key was refreshed recently
            current_time = time.time()
            if (current_time - self.last_refresh_time) < self.refresh_interval and self.public_key is not None:
                return True

            try:
                # Get the public key from the task-manager
                response = requests.get(f"{self.task_manager_url}/crypto/public-key", timeout=10)

                if response.status_code != 200:
                    logger.error(f"Failed to fetch task-manager public key: HTTP {response.status_code}")
                    return False

                data = response.json()

                # Get the public key PEM
                public_key_pem = data.get("public_key")
                if not public_key_pem:
                    logger.error("Task-manager did not return a valid public key")
                    raise ValueError("Task-manager did not return a valid public key")

                # Load the public key
                try:
                    self.public_key_pem = public_key_pem
                    self.public_key = load_pem_public_key(
                        public_key_pem.encode(),
                        backend=default_backend()
                    )
                    self.last_refresh_time = current_time
                    logger.info("Successfully refreshed task-manager public key")
                    return True
                except (UnsupportedAlgorithm, ValueError, TypeError) as e:
                    logger.error(f"Failed to load task-manager public key: {str(e)}")
                    raise ValueError(f"Failed to load task-manager public key: {str(e)}")

            except Exception as e:
                logger.error(f"Error refreshing task-manager public key: {str(e)}")
                raise ValueError(f"Error refreshing task-manager public key: {str(e)}")

    def encrypt(self, value: str) -> Optional[str]:
        """
        Encrypt a value using the task-manager's public key.

        Args:
            value: The value to encrypt

        Returns:
            The encrypted value as a base64-encoded string, or None if encryption fails
        """
        if not value:
            return None

        # Refresh the key if needed
        self.refresh_public_key()

        try:
            # Encrypt the value with the public key
            encrypted_data = self.public_key.encrypt(
                value.encode(),
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )

            # Return base64-encoded encrypted data
            return base64.b64encode(encrypted_data).decode()
        except Exception as e:
            logger.error(f"Error encrypting value: {type(e).__name__}")
            return None

    def encrypt_secrets(self, secrets: Dict[str, Dict[str, str]]) -> Tuple[bool, Optional[Dict[str, Dict[str, str]]]]:
        """
        Encrypt a dictionary of secrets.

        Args:
            secrets: Dictionary mapping secret types to dictionaries of key-value pairs

        Returns:
            A tuple of (success, encrypted_secrets)
            - success: True if encryption was successful or not needed, False otherwise
            - encrypted_secrets: Dictionary of encrypted secrets, or None if encryption was not performed
        """
        if not secrets:
            return True, None

        # Verify we have the public key
        self.refresh_public_key()

        encrypted_secrets = {}

        try:
            for secret_type, secret_values in secrets.items():
                encrypted_secrets[secret_type] = {}

                for key, value in secret_values.items():
                    encrypted_value = self.encrypt(value)
                    if encrypted_value is None:
                        logger.error(f"Failed to encrypt secret {secret_type}.{key}")
                        return False, None

                    encrypted_secrets[secret_type][key] = encrypted_value

            return True, encrypted_secrets
        except Exception as e:
            logger.error(f"Error encrypting secrets: {str(e)}")
            return False, None

    def can_encrypt(self) -> bool:
        """
        Check if encryption to task-manager is available and configured.

        Returns:
            bool: True if encryption is enabled and working, False otherwise
        """
        if not self.task_manager_url:
            return False

        self.refresh_public_key()

        return True


# Create a singleton instance for use throughout the application
crypto_service = CryptoService()
