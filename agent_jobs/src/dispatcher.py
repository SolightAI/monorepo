from .config import Config
from .job_parser import Job, JobType

from .jobs.validate_url import handler as validate_url_handler


class DispatchError(Exception):
  """Error raised when dispatching a job fails."""
  pass


async def dispatch_job(config: Config, job: Job) -> None:
  match job.job_type:
    case JobType.VALIDATE_URL:
      await validate_url_handler(config, job.job_id, job.payload.url)
      pass
    case JobType.GENERATE_TESTS:
      pass
    case JobType.RUN_TEST:
      pass
    case _:
      raise DispatchError(f"Unknown job type: {job.job_type}")