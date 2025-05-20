from typing import Any, Optional
from pydantic import BaseModel

from utils.dto import Product, Epic, Feature, Test, TestCategory, TestStatus


class GenerateTestsPayload(BaseModel):
    """Generate tests payload

    Attributes:
      product (Product): Product model
      epic (Epic): Epic model
      feature (Feature): Feature model
      secrets (Optional[list[dict[str, Any]]]): Secrets
    """

    product: Product
    epic: Epic
    feature: Feature
    categories: Optional[list[TestCategory]]
    secrets: Optional[list[dict[str, Any]]]


class GeneratedTestResult(BaseModel):
    results: list[Test]
    status: TestStatus
