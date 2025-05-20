import logging
import json

from typing import Any, Optional
from lmnr import Laminar, observe

from config.config import get_config
from utils.dto import Test, Product
from lambda_invoker import lambda_waiter

from .trigger_lambda import ImproveTestStepsJob, JobType, trigger_lambda
from .dtos import ImproveTestStepsPayload

logger = logging.getLogger(__name__)


@observe()
async def improve_test_steps(
    ctx: dict[Any, Any],
    product: dict[str, Any],  # used to get the login url
    feature: dict[
        str, Any
    ],  # TODO(TomChv): feature isn't used by the agent so we could remove it?
    test: dict[str, Any],
    secrets: Optional[list[dict[str, Any]]] = None,
) -> dict[str, Any]:
    product_obj: Product = Product(**product)
    test_obj: Test = Test(**test)

    Laminar.set_session(session_id=ctx["job_id"])
    Laminar.set_metadata({"task_id": ctx["job_id"], "job": improve_test_steps.__name__})

    config = get_config()

    try:
        await lambda_waiter.create_lambda_waiter_job(ctx["job_id"])
        await trigger_lambda(
            config,
            ImproveTestStepsJob(
                job_type=JobType.IMPROVE_TEST_STEPS,
                job_id=ctx["job_id"],
                payload=ImproveTestStepsPayload(
                    product=product_obj,
                    test=test_obj,
                    secrets=secrets,
                ),
            ),
        )

        result_payload = await lambda_waiter.wait_for_lambda_result(ctx["job_id"])
        result = json.loads(result_payload)

        logger.info(f"[{ctx['job_id']}] Test Improvement Output: {result}")

        return result
    except Exception as e:
        logger.error(f"[{ctx['job_id']}] Error Test Improvement: {e}")
        raise e
    finally:
        await lambda_waiter.delete_waiter_job(ctx["job_id"])
