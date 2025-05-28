import asyncio
import logging
import sys

from fastapi import FastAPI, BackgroundTasks

from src.job_parser import Job
from src.dispatcher import dispatch_job
from src.config import get_config

config = get_config()

logging.basicConfig(
    level=logging.INFO,
    stream=sys.stdout,
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}',
    force=True,
)

logger = logging.getLogger(__name__)

app = FastAPI()


@app.post("/")
async def root(job: Job, background_tasks: BackgroundTasks):
    asyncio.create_task(dispatch_job(config, job))

    return {"message": "Job dispatched successfully"}
