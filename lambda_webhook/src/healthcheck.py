from fastapi import APIRouter, HTTPException, status

from src.redis_store import client as redis

router = APIRouter(prefix="/healthcheck")


@router.get("", status_code=status.HTTP_200_OK)
def healthcheck():
    if redis.redis().ping() is True:
        return {"status": "ok"}

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Unhealthy, redis is not responding",
    )
