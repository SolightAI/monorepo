import os
import json
import base64

from services import auth_services
from dependencies import get_current_user
from dto.models import User
from fastapi import APIRouter, Depends, Response, Request
from pydantic import BaseModel
from typing import Optional


router = APIRouter(prefix="/auth")


@router.get("/login/google")
async def login_google(invitation_code: Optional[str] = None):
    state = ""
    if invitation_code:
        # Encode the invitation code in a state parameter
        state_data = {"invitation_code": invitation_code}
        state = f"&state={base64.urlsafe_b64encode(json.dumps(state_data).encode()).decode()}"

    return {
        "url": f"https://accounts.google.com/o/oauth2/auth?response_type=code&client_id={os.getenv('GOOGLE_CLIENT_ID')}&redirect_uri={os.getenv('GOOGLE_REDIRECT_URI')}&scope=openid%20profile%20email&access_type=offline{state}"
    }


class RefreshTokenRequest(BaseModel):
    refresh_token: str


@router.post("/refresh-google-token")
async def refresh_google_token(params: RefreshTokenRequest):
    return await auth_services.refresh_google_token(refresh_token=params.refresh_token)


@router.get("/google/callback")
async def auth_google(code: str, state: str | None = None, response: Response | None = None) -> dict:
    invitation_code = None
    if state:
        try:
            state_data = json.loads(base64.urlsafe_b64decode(state).decode())
            invitation_code = state_data.get("invitation_code")
        except Exception:
            # If state parsing fails, continue without invitation code
            pass

    return await auth_services.auth_google_callback(code=code, response=response, invitation_code=invitation_code)


@router.post("/confirm/new")
def confirm(request: Request, current_user: User = Depends(get_current_user)) -> dict:
    return auth_services.generate_and_send_confirmation_email(user=current_user, request=request)


@router.get("/confirm/{token}")
async def confirm(token: str, current_user: User = Depends(get_current_user)):
    return await auth_services.confirm_user(user=current_user, token=token)


@router.post("/logout")
async def logout(response: Response) -> dict:
    return await auth_services.logout(response)


@router.get("/is-admin")
async def is_admin(current_user: User = Depends(get_current_user)) -> dict:
    return await auth_services.check_is_admin(current_user)


@router.get("/check-auth")
async def check_auth(current_user: User = Depends(get_current_user)) -> dict:
    """Check if the user is authenticated and return user info"""
    return {
        "authenticated": True,
        "user": {
            "id": str(current_user.id),
            "email": current_user.email,
            "username": current_user.username,
            "is_admin": current_user.is_admin
        }
    }
