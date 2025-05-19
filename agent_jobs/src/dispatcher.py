from .config import Config
from .job_parser import Job, JobType

from .jobs.validate_url import handler as validate_url_handler
from .jobs.generate_tests import handler as generate_tests_handler
from .jobs.improve_test_steps import handler as improve_test_steps_handler
from .jobs.run_test import handler as run_test_handler


class DispatchError(Exception):
    """Error raised when dispatching a job fails."""

    pass


async def dispatch_job(config: Config, job: Job) -> None:
    match job.job_type:
        case JobType.VALIDATE_URL:
            await validate_url_handler(
                config=config, job_id=job.job_id, url=job.payload.url
            )
        case JobType.GENERATE_TESTS:
            await generate_tests_handler(
                config=config,
                job_id=job.job_id,
                product=job.payload.product,
                epic=job.payload.epic,
                feature=job.payload.feature,
                secrets=job.payload.secrets,
                categories=job.payload.categories,
            )
        case JobType.RUN_TEST:
            await run_test_handler(
                config=config,
                job_id=job.job_id,
                product=job.payload.product,
                feature=job.payload.feature,
                test=job.payload.test,
                secrets=job.payload.secrets,
            )
        case JobType.IMPROVE_TEST_STEPS:
            await improve_test_steps_handler(
                config=config,
                job_id=job.job_id,
                product=job.payload.product,
                test=job.payload.test,
                secrets=job.payload.secrets,
            )
        case _:
            raise DispatchError(f"Unknown job type: {job.job_type}")
