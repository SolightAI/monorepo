from pydantic import BaseModel


def build_job_key(job_id: str) -> str:
    return f"solight:lambda-webhook:job:{job_id}"


class Job(BaseModel):
    status: str
    result: str | None = None
