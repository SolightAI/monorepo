from typing import Any, Optional
from pydantic import BaseModel

from src.agents.base_agent import BaseAgentResult
from src.common.dto import Feature, Product, Test


class RunTestPayload(BaseModel):
    """Run test payload

    Attributes:
        product (Product): Product model
        test (Test): Test model
        test (Feature): Feature model
        secrets (Optional[list[dict[str, Any]]]): Secrets to use for the test
        run_with_cache (Optional[bool]): Whether to run the test with cache
    """

    product: Product
    feature: Feature
    test: Test
    secrets: Optional[list[dict[str, Any]]]
    run_without_cache: Optional[bool]


class RunTestResult(BaseAgentResult):
    pass
