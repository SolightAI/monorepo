import os
import logging

from fastapi import FastAPI
from endpoints.product_endpoints import router as product_router
from endpoints.epic_endpoints import router as epic_router
from endpoints.feature_endpoints import router as feature_router
from endpoints.user_story_endpoints import router as user_story_router
from endpoints.test_endpoints import router as test_router
from endpoints.test_execution_endpoints import router as test_execution_router
from endpoints.acceptance_criteria_endpoints import router as acceptance_criteria_router
from endpoints.invitation_endpoints import router as invitation_router
from endpoints.organization_endpoints import router as organization_router
from endpoints.secret_endpoints import router as secret_router
from endpoints.user_endpoints import router as user_router
from endpoints.demo_endpoints import router as demo_router
from fastapi.middleware.cors import CORSMiddleware
from tortoise.contrib.fastapi import RegisterTortoise
from contextlib import asynccontextmanager
from dto.db_config import _get_db_config
from endpoints.auth_endpoints import router as auth_router


logging.basicConfig(level=logging.INFO)


# --- Environment Variable Check ---
required_env_vars = {
    "JWT_SECRET_KEY": None,  # Check for JWT secret as well
    "GOOGLE_CLIENT_ID": None,
    "GOOGLE_CLIENT_SECRET": None,
    "GOOGLE_REDIRECT_URI": None,
    "AZURE_CLIENT_ID": None,
    "AZURE_CLIENT_SECRET": None,
    "AZURE_TENANT_ID": None,
    "AZURE_REDIRECT_URI": None,
    "APP_URL": None,  # Frontend URL needed for redirects
    "DEMO_ACCOUNT_EMAIL": None,
    # Add any other essential variables here
}

missing_vars = []
for var in required_env_vars:
    value = os.getenv(var)
    if not value:
        missing_vars.append(var)
    else:
        required_env_vars[var] = value  # Store the value if needed elsewhere, though usually accessed via os.getenv directly

if missing_vars:
    logging.error(f"Missing required environment variables: {', '.join(missing_vars)}")
    raise ValueError(f"Application cannot start due to missing environment variables: {', '.join(missing_vars)}")
else:
    logging.info("All required environment variables are present.")
# --- End Environment Variable Check ---


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

# Add CORS middleware to allow cross-origin requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("APP_URL", "http://localhost:3000"),],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(organization_router)
app.include_router(product_router)
app.include_router(epic_router)
app.include_router(feature_router)
app.include_router(user_story_router)
app.include_router(acceptance_criteria_router)
app.include_router(test_router)
app.include_router(test_execution_router)
app.include_router(invitation_router)
app.include_router(secret_router)
app.include_router(user_router)
app.include_router(demo_router)
