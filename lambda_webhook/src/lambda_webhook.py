import logging
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from src.redis_store import client as redis
from src.redis_store import job as redis_lambda_job

router = APIRouter(prefix="/lambda-webhook")

logger = logging.getLogger(__name__)


class LambdaWebhookBody(BaseModel):
    status: str
    job_id: str
    result: str


@router.post("")
def lambda_webhook(param: LambdaWebhookBody):
    logger.info(
        f"Received job {param.job_id} with status {param.status} and result {param.result}"
    )

    try:
        job_key = redis_lambda_job.build_job_key(param.job_id)
        job = redis.redis().get(job_key, redis_lambda_job.Job)

        if job is None:
            logger.error(f"Job {param.job_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {param.job_id} not found",
            )

        if job.status != "in_progress":
            logger.error(
                f"Job {param.job_id} is not in progress ; status is {job.status}"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Job {param.job_id} is not in progress ; status is {job.status}",
            )

        job.status = param.status
        job.result = param.result

        redis.redis().set(job_key, job.model_dump_json())

        logger.info(
            f"Job {param.job_id} updated with status {param.status} and result {param.result}"
        )
        return {"status": "success", "message": f"Job {param.job_id} updated"}
    except Exception as e:
        logger.error(f"Error updating job {param.job_id} status: {str(e)}")
        if isinstance(e, HTTPException):
            raise e

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
