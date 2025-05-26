from typing import Any, Optional
from pydantic import BaseModel


from src.common.dto import Product, Test, TestStatus


class ImproveTestStepsPayload(BaseModel):
    """Improve test steps payload

    Attributes:
        product (Product): Product model
        feature (Feature): Feature model
        test (Test): Test model
        secrets (Optional[list[dict[str, Any]]]): Secrets
    """

    product: Product
    test: Test
    secrets: Optional[list[dict[str, Any]]]


class ImproveTestStepsResult(BaseModel):
    """Improve test steps result

    Attributes:
        status (TestStatus): Test status
        results (str): Test results
    """

    status: TestStatus
    results: str
