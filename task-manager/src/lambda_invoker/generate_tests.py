import logging
import json

from typing import Any, Optional
from lmnr import Laminar, observe

from config.config import get_config
from lambda_invoker import lambda_waiter
from utils.dto import Product, Epic, Feature, TestCategory

from .dtos import GenerateTestsPayload
from .trigger_lambda import GenerateTestsJob, JobType, trigger_lambda

logger = logging.getLogger(__name__)


@observe()
async def generate_tests(
    ctx: dict[Any, Any],
    product: dict[str, Any],
    epic: dict[str, Any],
    feature: dict[str, Any],
    secrets: Optional[list[dict[str, Any]]] = None,
    categories: Optional[list[TestCategory]] = None,
) -> dict[str, Any]:
    """
    Endpoint to generate tests for a feature.

    Args:
        product: Product information
        epic: Epic information
        feature: Feature information
        background_task: Background tasks handler
        secrets: List of secret dictionaries for authentication
                 (expected to be encrypted if provided)
        categories: List of test categories to generate. If None, defaults to [TestCategory.SMOKE].
                    If an empty list is provided, no tests will be generated.

    Returns:
        Task ID for tracking the test generation process
    """

    Laminar.set_session(session_id=ctx["job_id"])
    Laminar.set_metadata({"task_id": ctx["job_id"], "job": generate_tests.__name__})

    product_obj: Product = Product(**product)
    epic_obj: Epic = Epic(**epic)
    feature_obj: Feature = Feature(**feature)

    # TODO(TomChv): This should be refactored to a global config loaded
    # when the binary starts instead of fetching env vars on every call.
    config = get_config()

    try:
        logger.info(f"[{ctx['job_id']}] Generating tests for {feature_obj.name}")
        
        await lambda_waiter.create_lambda_waiter_job(ctx["job_id"])
        await trigger_lambda(
            config,
            GenerateTestsJob(
                job_type=JobType.GENERATE_TESTS,
                job_id=ctx["job_id"],
                payload=GenerateTestsPayload(
                    product=product_obj,
                    epic=epic_obj,
                    feature=feature_obj,
                    categories=categories,
                    secrets=secrets,
                ),
            ),
        )

        result_payload = await lambda_waiter.wait_for_lambda_result(ctx["job_id"])
        result = json.loads(result_payload)

        logger.info(f"[{ctx['job_id']}] Test Generation Output: {result}")

        return result
    except Exception as e:
        logger.error(f"[{ctx['job_id']}] Error Test Generation: {e}")

        raise e
    finally:
        await lambda_waiter.delete_waiter_job(ctx["job_id"])
