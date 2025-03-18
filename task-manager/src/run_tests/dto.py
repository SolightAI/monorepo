from pydantic import BaseModel


class Test(BaseModel):
    name: str = None
    description: str = None
    url: str = None
    preconditions: str = None
    steps: str = None
    expected_results: str = None
    assertions: str = None
