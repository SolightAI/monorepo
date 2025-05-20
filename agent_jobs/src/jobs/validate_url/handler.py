import logging

from agent_jobs.src.jobs.validate_url.dto import ValidateURLResult

from .agent import run


from src.config import Config

logger = logging.getLogger(__name__)


async def handler(config: Config, job_id: str, url: str) -> ValidateURLResult:
    """Validate URL by checking if a login page exists.

    Args:
      config: The configuration object.
      job_id: The ID of the job.
      url: The URL to validate.
    """
    try:
        logger.info(f"[{job_id}] Validating URL: {url}")

        result = await run(config, job_id, url)

        logger.info(f"[{job_id}] URL validated successfully: {url}")

        return result
    except Exception as e:
        logger.error(f"Error validating URL: {url} - {str(e)}")
        raise e
