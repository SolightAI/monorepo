from pydantic import BaseModel
from src.common.dto import Product, Test


class RunTestPayload(BaseModel):
    """Run test payload

    Attributes:
        product (Product): Product model
        test (Test): Test model
    """

    product: Product
    test: Test
