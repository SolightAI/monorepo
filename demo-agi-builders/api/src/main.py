import uvicorn

from fastapi import FastAPI
from dto.schemas import Product, Epic, Feature, Test, TestCategory, TestStatus, UserStory
from endpoints.product_endpoints import router as product_router
from endpoints.epic_endpoints import router as epic_router
from endpoints.feature_endpoints import router as feature_router
from endpoints.user_story_endpoints import router as user_story_router
from endpoints.test_endpoints import router as test_router
from endpoints.bug_endpoints import router as bug_router
from uuid import uuid4
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from tortoise.contrib.fastapi import RegisterTortoise
from contextlib import asynccontextmanager
from dto.db_config import _get_db_config


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with RegisterTortoise(
        app=app,
        config=_get_db_config(),
        generate_schemas=True,
        add_exception_handlers=True,
    ):
        yield


app = FastAPI(lifespan=lifespan)

app.include_router(product_router)
app.include_router(epic_router)
app.include_router(feature_router)
app.include_router(user_story_router)
app.include_router(test_router)
app.include_router(bug_router)

# @app.get("/{product_id}")
# def get_product(product_id: str) -> Product:
#     return Product(id=uuid4(), name="Product 1", description="Description 1", url="https://example.com")


# @app.get("/{product_id}/{epic_id}")
# def get_epic(product_id: str, epic_id: str) -> Epic:
#     return Epic(id=uuid4(), name="Epic 1", description="Description 1", product_id=uuid4(), url="https://example.com")


# @app.get("/{product_id}/{epic_id}/{feature_id}")
# def get_feature(product_id: str, epic_id: str, feature_id: str) -> Feature:
#     return Feature(id=uuid4(), name="Feature 1", description="Description 1", epic_id=uuid4(), title="Title 1")


# @app.get("/{product_id}/{epic_id}/{feature_id}/{user_story_id}")
# def get_user_story(product_id: str, epic_id: str, feature_id: str, user_story_id: str) -> UserStory:
#     return UserStory(id=uuid4(), title="Title 1", description="Description 1", feature_id=uuid4(), url="https://example.com")


# @app.get("/{product_id}/{epic_id}/{feature_id}/{user_story_id}/{test_id}")
# def get_test(product_id: str, epic_id: str, feature_id: str, user_story_id: str, test_id: str) -> Test:
#     return Test(id=uuid4(), name="Test 1", description="Description 1", feature_id=uuid4(), url="https://example.com", category=TestCategory.FUNCTIONAL, status=TestStatus.PASSED, started_at=datetime.now(), ended_at=datetime.now(), user_story_id=uuid4())


# if __name__ == "__main__":
#     uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
