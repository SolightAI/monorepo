import os
import base64
import logging
from typing import Dict
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.backends import default_backend


# Configure logging
logger = logging.getLogger(__name__)


class CryptoService:
    """Service for asymmetric encryption operations in task-manager."""

    def __init__(self):
        """Initialize the crypto service."""
        self.private_key = None
        self.public_key = None
        self.public_key_pem = None

        # Path where the private key will be stored
        self.private_key_path = os.getenv("PRIVATE_KEY_PATH", "/app/keys/private.pem")

        # Initialize the keys
        self.initialize_keys()

    def initialize_keys(self) -> None:
        """Initialize keys - either load existing or generate new ones."""
        try:
            # Check if we have existing keys to load
            if self._load_keys():
                logger.info("Loaded existing RSA key pair")
            else:
                # Generate new keys
                self._generate_keys()
                logger.info("Generated new RSA key pair")

                # Save the keys for future use
                self._save_keys()
        except Exception as e:
            logger.error(f"Failed to initialize keys: {str(e)}")
            # We'll try to initialize keys again when needed

    def _generate_keys(self) -> None:
        """Generate a new RSA key pair."""
        # Generate a private key
        self.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend()
        )

        # Get the public key
        self.public_key = self.private_key.public_key()

        # Get the PEM representation of the public key
        self.public_key_pem = self.public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')

    def _save_keys(self) -> None:
        """Save the private key to a PEM file."""
        if not self.private_key:
            return

        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(self.private_key_path), exist_ok=True)

            # Serialize the private key with no encryption
            pem = self.private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            )

            # Write to file
            with open(self.private_key_path, 'wb') as f:
                f.write(pem)

            logger.info(f"Private key saved to {self.private_key_path}")
        except Exception as e:
            logger.error(f"Failed to save private key: {str(e)}")

    def _load_keys(self) -> bool:
        """
        Load the private key from a PEM file.

        Returns:
            bool: True if keys were loaded successfully, False otherwise
        """
        try:
            key_path = Path(self.private_key_path)
            if not key_path.exists():
                return False

            # Read the private key
            with open(key_path, 'rb') as f:
                private_key_data = f.read()

            # Load the private key
            self.private_key = serialization.load_pem_private_key(
                private_key_data,
                password=None,
                backend=default_backend()
            )

            # Get the public key
            self.public_key = self.private_key.public_key()

            # Get the PEM representation of the public key
            self.public_key_pem = self.public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            ).decode('utf-8')

            return True
        except Exception as e:
            logger.error(f"Failed to load private key: {str(e)}")
            return False

    def get_public_key(self) -> Dict[str, str]:
        """
        Get the public key in PEM format.

        Returns:
            dict: A dictionary containing the public key in PEM format
        """
        if not self.public_key_pem:
            # Try to initialize keys if we don't have them yet
            self.initialize_keys()

            # If still no keys, return None
            if not self.public_key_pem:
                logger.error("No public key available")
                return {"public_key": None}

        return {
            "public_key": self.public_key_pem
        }

    def decrypt(self, encrypted_value: str) -> str:
        """
        Decrypt a value using the private key.

        Args:
            encrypted_value: Base64-encoded encrypted value

        Returns:
            The decrypted value as a string

        Raises:
            ValueError: If the value cannot be decrypted
        """
        if not self.private_key:
            # Try to initialize keys if we don't have them yet
            self.initialize_keys()

            # If still no private key, raise an error
            if not self.private_key:
                raise ValueError("Private key is not available")

        if not encrypted_value:
            return ""

        try:
            # Decode from base64
            encrypted_data = base64.b64decode(encrypted_value)

            # Decrypt using the private key
            decrypted_data = self.private_key.decrypt(
                encrypted_data,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )

            # Return the decrypted value
            return decrypted_data.decode('utf-8')
        except Exception as e:
            logger.error(f"Error decrypting value: {type(e).__name__}")
            raise ValueError("Failed to decrypt the value") from e

    def decrypt_secrets(self, encrypted_secrets: Dict[str, Dict[str, str]]) -> Dict[str, Dict[str, str]]:
        """
        Decrypt a dictionary of encrypted secrets.

        Args:
            encrypted_secrets: Dictionary mapping secret types to dictionaries of key-value pairs

        Returns:
            Dictionary of decrypted secrets with the same structure
        """
        if not encrypted_secrets:
            return {}

        decrypted_secrets = {}

        for secret_type, secrets in encrypted_secrets.items():
            decrypted_secrets[secret_type] = {}

            for key, value in secrets.items():
                try:
                    decrypted_value = self.decrypt(value)
                    decrypted_secrets[secret_type][key] = decrypted_value
                except Exception as e:
                    logger.error(f"Failed to decrypt secret {secret_type}.{key}: {str(e)}")
                    # Include a placeholder to indicate decryption failed
                    decrypted_secrets[secret_type][key] = ""

        return decrypted_secrets


# Create a singleton instance for use throughout the application
crypto_service = CryptoService()
