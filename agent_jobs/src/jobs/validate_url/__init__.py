"""
Validate URL module exposes an AWS lambda function
to validate a URL using an agent.
"""
from .handler import handler
from .dto import ValidateURLPayload

__all__ = [
    "ValidateURLPayload",
    "handler",
]