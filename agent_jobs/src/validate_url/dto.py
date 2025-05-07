from pydantic import BaseModel


class Body(BaseModel):
    job_id: str
    url: str


class Result(BaseModel):
    valid: bool
    confidence: str
    message: str
    login_url: str | None
    original_url: str
    source: str
