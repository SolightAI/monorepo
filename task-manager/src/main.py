import os
import asyncio
import logging

from concurrent import futures
from arq.worker import run_worker, func
from arq.connections import RedisSettings
from generation.test_generation import generate_tests
from test_run.test_endpoint import run_test
from validate_url.validate_url import validate_url


logger = logging.getLogger(__name__)


MAX_JOBS = 4


async def startup(ctx):
    ctx['pool'] = futures.ProcessPoolExecutor(
        max_workers=MAX_JOBS,  # one per job
        max_tasks_per_child=1
    )


class WorkerSettings:
    functions = [
        func(generate_tests),
        func(run_test),  # we do not want to retry test runs
        func(validate_url),
    ]

    on_startup = startup

    # TODO: instead of polling we could use a webhook to inform the api that a job is done
    # FIXME: Sometimes the worker(s) pull(s) a random job at start

    redis_settings = RedisSettings(
        host=os.getenv("REDIS_HOST"),
        port=os.getenv("REDIS_PORT"),
        database=os.getenv("REDIS_DB"),
        password=os.getenv("REDIS_PASSWORD"),
        retry_on_timeout=True,
        retry_on_error=[Exception],
        conn_timeout=5,  # 5 * 7 = 35 seconds to connect to redis
        conn_retries=7,
        conn_retry_delay=1,
    )

    retry_jobs = False
    max_tries = 1
    max_jobs = MAX_JOBS
    allow_abort_jobs = True

    job_timeout = 60 * 15  # 15 minutes in process before being timed out
    expires_extra_ms = 1000 * 60 * 15  # 60 minutes max in the queue before being timed out

    keep_result = 60


if __name__ == "__main__":
    logger.info(f"Starting worker with {WorkerSettings.max_jobs} jobs")

    asyncio.run(run_worker(WorkerSettings))
