from enum import Enum
from pydantic import BaseModel


class ValidateURLPayload(BaseModel):
    """Validate URL payload

    Attributes:
        url (str): URL to validate
    """

    url: str


class ConfidenceLevel(str, Enum):
    """Confidence levels for login page detection.

    Attributes:
        HIGH (str): High confidence
        MEDIUM (str): Medium confidence
        LOW (str): Low confidence
    """

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ValidateURLResult(BaseModel):
    """Validate URL result

    Attributes:
        valid (bool): Whether the URL is valid
        confidence (str): Confidence level of the validation
        message (str): Message describing the validation result
        login_url (str | None): Login URL if the URL is valid
        original_url (str): Original URL provided
        source (str): Source of the validation result
    """

    valid: bool
    confidence: ConfidenceLevel
    message: str
    login_url: str | None
    original_url: str
    source: str
