from typing import Any, Optional
from pydantic import BaseModel

from src.common.dto import Product, Epic, Feature


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
    secrets: Optional[list[dict[str, Any]]]
