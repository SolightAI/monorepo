import logging

from .agent import run


from src.config import Config

logger = logging.getLogger(__name__)

async def handler(
    config: Config,
    job_id: str,
    url: str
) -> None:
    """Validate URL by checking if a login page exists.

    Args:
      config: The configuration object.
      job_id: The ID of the job.
      url: The URL to validate.
    """
    try:
        logger.info(f"[{job_id}] Validating URL: {url}")
        
        result = await run(config, url)
        config.webhook_client.send_success(job_id, result.model_dump_json())
        
        logger.info(f"[{job_id}] URL validated successfully: {url} ; sending result back to webhook")
    except Exception as e:
        logger.error(f"Error validating URL: {url} - {str(e)}")
        raise e
    