import logging
import os

from dto.schemas import User
from services import auth_services, user_services
from fastapi import Cookie, HTTPException, status


async def get_current_user_dependency(access_token: str = Cookie(None)) -> User:

    if not access_token:
        logging.info("User has no access_token, returning 401.")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    return await auth_services.get_current_user(access_token)

async def get_demo_account_dependency() -> User:
    demo_email = os.getenv("DEMO_ACCOUNT_EMAIL")
    if not demo_email:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    demo_account = await user_services.get_user(email=demo_email)
    if not demo_account:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return demo_account