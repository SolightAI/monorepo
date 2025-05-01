import os
import json
import base64
import logging

from services import auth_services
from services.invitation_services import get_invitation_by_code
from dependencies import get_current_user_dependency
from dto.models import User
from fastapi import APIRouter, Depends, Response, HTTPException, status, Cookie
from pydantic import BaseModel
from typing import Optional
from fastapi.responses import RedirectResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None


router = APIRouter(prefix="/auth")


@router.get("/login/google")
async def login_google(invitation_code: Optional[str] = None) -> dict:
    state = {}

    if invitation_code:
        try:
            # Get the invitation to determine its type
            invitation = await get_invitation_by_code(invitation_code)
            state["invitation_code"] = invitation_code

            # Determine the invitation type based on the invitation data
            if invitation.organization_id:
                state["type"] = "organization"
            elif invitation.email:
                state["type"] = "individual"
            else:
                state["type"] = "domain"  # Default to domain if no specific type is set
        except HTTPException:
            # If the invitation is not found or invalid, we'll still include the code
            # but let the callback handle the validation
            state["invitation_code"] = invitation_code
            state["type"] = "unknown"

    state_param = f"&state={base64.urlsafe_b64encode(json.dumps(state).encode()).decode()}" if state else ""

    return {
        "url": f"https://accounts.google.com/o/oauth2/auth?response_type=code&client_id={os.getenv('GOOGLE_CLIENT_ID')}&redirect_uri={os.getenv('GOOGLE_REDIRECT_URI')}&scope=openid%20profile%20email&access_type=offline{state_param}"
    }


@router.get("/google/callback")
async def auth_google(code: str, state: Optional[str] = None, response: Response = None) -> dict:
    invitation_code = None
    if state:
        try:
            state_data = json.loads(base64.urlsafe_b64decode(state).decode())
            invitation_code = state_data.get("invitation_code")
        except Exception:
            # If state parsing fails, continue without invitation code
            pass

    return await auth_services.auth_google_callback(code=code, response=response, invitation_code=invitation_code)


@router.post("/refresh")
async def refresh_token(request: RefreshTokenRequest, response: Response, refresh_token_cookie: Optional[str] = Cookie(None, alias="refresh_token")) -> dict:
    """Generate a new access token using a refresh token"""
    # First try to get the refresh token from the cookie
    refresh_token = refresh_token_cookie

    # If not in cookie, try the request body
    if not refresh_token and request.refresh_token:
        refresh_token = request.refresh_token

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Refresh token not found in cookie or request body"
        )

    try:
        result = await auth_services.refresh_access_token(refresh_token, response)
        return result
    except HTTPException as e:
        raise e


@router.get("/login/azure")
async def login_azure(invitation_code: Optional[str] = None) -> dict:
    """Generates the Azure AD login URL."""
    state = {}
    if invitation_code:
        # Similar state handling as Google for invitations
        try:
            invitation = await get_invitation_by_code(invitation_code)
            state["invitation_code"] = invitation_code
            if invitation.organization_id:
                state["type"] = "organization"
            elif invitation.email:
                state["type"] = "individual"
            else:
                state["type"] = "domain"
        except HTTPException:
            state["invitation_code"] = invitation_code
            state["type"] = "unknown"

    # State needs to be encoded for the URL
    state_param = base64.urlsafe_b64encode(json.dumps(state).encode()).decode() if state else ""

    # Construct the Azure AD authorization URL
    # Note: Scopes required: openid, profile, email, offline_access (if using refresh tokens)
    authority = f"https://login.microsoftonline.com/{os.getenv('AZURE_TENANT_ID')}"
    auth_url = f"{authority}/oauth2/v2.0/authorize?"
    params = {
        "client_id": os.getenv('AZURE_CLIENT_ID'),
        "response_type": "code",
        "redirect_uri": os.getenv('AZURE_REDIRECT_URI'),
        "response_mode": "query",
        "scope": "openid profile email offline_access User.Read",  # Added User.Read for basic graph info
        "state": state_param
    }
    # Filter out empty params just in case
    query_string = "&".join([f"{k}={v}" for k, v in params.items() if v])
    return {"url": f"{auth_url}{query_string}"}


@router.get("/azure/callback")
async def auth_azure(code: str, state: Optional[str] = None, response: Response = None, error: Optional[str] = None, error_description: Optional[str] = None) -> dict:
    """Handles the callback from Azure AD after user authentication."""
    # Handle potential errors from Azure AD
    if error:
        logging.error(f"Azure AD login error: {error} - {error_description}")
        # Redirect to frontend with error parameters
        error_query = f"error=azure_login_failed&error_description={error_description or 'Unknown Azure AD error'}"
        return RedirectResponse(url=f"{os.getenv('APP_URL')}/auth/callback?{error_query}")

    invitation_code = None
    if state:
        try:
            state_data = json.loads(base64.urlsafe_b64decode(state).decode())
            invitation_code = state_data.get("invitation_code")
        except Exception as e:
            logging.warning(f"Failed to parse state parameter: {e}")
            # Proceed without invitation code if state is invalid
            pass

    # Delegate the core logic to auth_services
    return await auth_services.auth_azure_callback(code=code, response=response, invitation_code=invitation_code)


# @router.post("/confirm/new")
# def confirm(request: Request, current_user: User = Depends(get_current_user)) -> dict:
#     return auth_services.generate_and_send_confirmation_email(user=current_user, request=request)


# @router.get("/confirm/{token}")
# async def confirm(token: str, current_user: User = Depends(get_current_user)):
#     return await auth_services.confirm_user(user=current_user, token=token)


@router.post("/logout")
async def logout(response: Response) -> dict:
    return await auth_services.logout(response)


@router.get("/is-admin/")
async def is_admin(current_user: User = Depends(get_current_user_dependency)) -> dict:
    is_admin_result = await auth_services.check_is_admin(current_user)
    return {"is_admin": is_admin_result}


@router.get("/check-auth")
async def check_auth(current_user: User = Depends(get_current_user_dependency)) -> dict:
    """Check if the user is authenticated and return user info"""
    return {
        "authenticated": True,
        "user": {
            "id": str(current_user.id),
            "email": current_user.email,
            "username": current_user.username,
            "is_admin": current_user.is_admin,
            "onboarding_completed": current_user.onboarding_completed
        }
    }
