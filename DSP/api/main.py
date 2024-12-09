import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from tortoise.contrib.fastapi import RegisterTortoise
from contextlib import asynccontextmanager
from database.database import _get_db_config
from endpoints.auth import router as auth_router
from endpoints.user_endpoint import router as user_router

# Configure logging
logging.basicConfig(level=logging.INFO)

# Disable httpx logging
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("stripe").setLevel(logging.WARNING)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with RegisterTortoise(
        app=app,
        config=_get_db_config(),
        generate_schemas=True,
        add_exception_handlers=True,
    ):
        yield


app = FastAPI(debug=True, lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3000",
        "http://localhost:8888",
        "https://anyrecs.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(user_router, prefix="/user", tags=["user"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
