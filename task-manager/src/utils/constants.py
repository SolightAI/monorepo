import os

from enum import Enum


AZURE_OPENAI_ENDPOINT = os.getenv('AZURE_OPENAI_ENDPOINT', '')
if AZURE_OPENAI_ENDPOINT is None:
    raise ValueError('AZURE_OPENAI_ENDPOINT is not set')

AZURE_OPENAI_KEY = os.getenv('AZURE_OPENAI_KEY', '')
if AZURE_OPENAI_KEY is None:
    raise ValueError('AZURE_OPENAI_KEY is not set')


class TestStatus(Enum):
    COMPLETED = "completed"
    FAILED = "failed"
    ERROR = "error"
    AGENT_LIMTATION = "agent_limitation"
    UNEXISTING_FEATURE = "unexisting_feature"
