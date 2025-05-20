import logging

from typing import Any
from .config import Config
from .job_parser import Job, JobType

from .jobs.validate_url import handler as validate_url_handler
from .jobs.generate_tests import handler as generate_tests_handler
from .jobs.improve_test_steps import handler as improve_test_steps_handler
from .jobs.run_test import handler as run_test_handler


logger = logging.getLogger(__name__)


class DispatchError(Exception):
    """Error raised when dispatching a job fails."""

    pass


async def dispatch_job(config: Config, job: Job) -> None:
    result: Any = {}

    match job.job_type:
        case JobType.VALIDATE_URL:
            result = await validate_url_handler(
                config=config, job_id=job.job_id, url=job.payload.url
            )
        case JobType.GENERATE_TESTS:
            result = await generate_tests_handler(
                config=config,
                job_id=job.job_id,
                product=job.payload.product,
                epic=job.payload.epic,
                feature=job.payload.feature,
                secrets=job.payload.secrets,
                categories=job.payload.categories,
            )
        case JobType.RUN_TEST:
            result = await run_test_handler(
                config=config,
                job_id=job.job_id,
                product=job.payload.product,
                feature=job.payload.feature,
                test=job.payload.test,
                secrets=job.payload.secrets,
                run_without_cache=job.payload.run_without_cache,
            )
        case JobType.IMPROVE_TEST_STEPS:
            result = await improve_test_steps_handler(
                config=config,
                job_id=job.job_id,
                product=job.payload.product,
                test=job.payload.test,
                secrets=job.payload.secrets,
            )
        case _:
            raise DispatchError(f"Unknown job type: {job.job_type}")

    config.webhook_client.send_success(job.job_id, result.model_dump_json())
    logger.info(f"[{job.job_id}] Job completed ; sending result back to webhook")
