from enum import Enum
from typing import Literal, Union

from pydantic import BaseModel, TypeAdapter

from .jobs.validate_url import ValidateURLPayload
from .jobs.generate_tests.dto import GenerateTestsPayload
from .jobs.run_test.dto import RunTestPayload


class JobType(str, Enum):
    VALIDATE_URL = "validate_url"
    GENERATE_TESTS = "generate_tests"
    RUN_TEST = "run_test"


class ValidateURLJob(BaseModel):
    job_type: Literal[JobType.VALIDATE_URL]
    job_id: str
    payload: ValidateURLPayload


class GenerateTestsJob(BaseModel):
    job_type: Literal[JobType.GENERATE_TESTS]
    job_id: str
    payload: GenerateTestsPayload


class RunTestJob(BaseModel):
    job_type: Literal[JobType.RUN_TEST]
    job_id: str
    payload: RunTestPayload


Job = Union[ValidateURLJob, GenerateTestsJob, RunTestJob]


def parse_job(payload: dict) -> Job:
    """Parse a job from a given payload.
    
    Args:
        payload (dict): The payload to parse.
    
    Returns:
        Job: The parsed job.
    
    Raises:
        ValidationError: If the payload is not a valid job.
    """
    job_adapter = TypeAdapter(Job)

    return job_adapter.validate_python(payload)
