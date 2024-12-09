import os

from services import auth_service
from dependencies import get_current_user
from schemas.user import User
from fastapi import APIRouter, Depends, Response, Request
from pydantic import BaseModel


router = APIRouter()


@router.get("/login/google")
async def login_google():
    return {
        "url": f"https://accounts.google.com/o/oauth2/auth?response_type=code&client_id={os.getenv('GOOGLE_CLIENT_ID')}&redirect_uri={os.getenv('GOOGLE_REDIRECT_URI')}&scope=openid%20profile%20email&access_type=offline"
    }


class RefreshTokenRequest(BaseModel):
    refresh_token: str


@router.post("/refresh-google-token")
async def refresh_google_token(params: RefreshTokenRequest):
    return await auth_service.refresh_google_token(refresh_token=params.refresh_token)


@router.get("/callback/google")
async def auth_google(code: str, response: Response):
    return await auth_service.auth_google_callback(code=code, response=response)


@router.post("/confirm/new")
def confirm(request: Request, current_user: User = Depends(get_current_user)):
    return auth_service.generate_and_send_confirmation_email(user=current_user, request=request)


@router.get("/confirm/{token}")
async def confirm(token: str, current_user: User = Depends(get_current_user)):
    return await auth_service.confirm_user(user=current_user, token=token)


@router.post("/logout")
async def logout(response: Response):
    return await auth_service.logout(response)
