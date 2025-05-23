import logging
import json

from typing import Any, Optional
from lmnr import observe, Laminar

from config.config import get_config
from utils.dto import Product, Test, Feature
from lambda_invoker import lambda_waiter

from .trigger_lambda import RunTestJob, JobType, trigger_lambda
from .dtos import RunTestPayload

logger = logging.getLogger(__name__)


@observe()
async def run_test(
    ctx: dict[Any, Any],
    product: dict[str, Any],  # used to get the login url
    feature: dict[str, Any],
    test: dict[str, Any],
    run_without_cache: bool = False,
    secrets: Optional[list[dict[str, Any]]] = None,
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
    product_obj: Product = Product(**product)
    test_obj: Test = Test(**test)
    feature_obj: Feature = Feature(**feature)

    Laminar.set_session(session_id=ctx["job_id"])
    Laminar.set_metadata({"task_id": ctx["job_id"], "job": run_test.__name__})

    # TODO(TomChv): This should be refactored to a global config loaded
    # when the binary starts instead of fetching env vars on every call.
    config = get_config()

    try:
        logger.info(f"[{ctx['job_id']}] Running test {test_obj.name} for {test_obj.url}")
        
        await lambda_waiter.create_lambda_waiter_job(ctx["job_id"])
        await trigger_lambda(
            config,
            RunTestJob(
                job_type=JobType.RUN_TEST,
                job_id=ctx["job_id"],
                payload=RunTestPayload(
                    product=product_obj,
                    feature=feature_obj,
                    test=test_obj,
                    secrets=secrets,
                    run_without_cache=run_without_cache,
                ),
            ),
        )

        result_payload = await lambda_waiter.wait_for_lambda_result(ctx["job_id"])
        result = json.loads(result_payload)

        logger.info(f"[{ctx['job_id']}] Test Running Output: {result}")

        return result
    except Exception as e:
        logger.error(f"[{ctx['job_id']}] Error Test Running: {e}")

        raise e
    finally:
        await lambda_waiter.delete_waiter_job(ctx["job_id"])
