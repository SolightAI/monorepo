import os

from enum import Enum


AZURE_OPENAI_ENDPOINT = os.getenv('AZURE_OPENAI_ENDPOINT', '')
if AZURE_OPENAI_ENDPOINT is None:
    raise ValueError('AZURE_OPENAI_ENDPOINT is not set')

AZURE_OPENAI_KEY = os.getenv('AZURE_OPENAI_KEY', '')
if AZURE_OPENAI_KEY is None:
    raise ValueError('AZURE_OPENAI_KEY is not set')


class TestStatus(Enum):
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    ERROR = "error"
    AGENT_LIMITATION = "agent_limitation"
    UNEXISTING_FEATURE = "unexisting_feature"
    BLOCKED_BY_CAPTCHA = "blocked_by_captcha"
    UNKNOWN = "unknown"
