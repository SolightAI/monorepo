import os
import jwt
import logging
import requests
from typing import Optional

from dto.models import User as UserModel
from passlib.context import CryptContext
from fastapi.responses import RedirectResponse
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status, Response
from itsdangerous import URLSafeTimedSerializer
from services.user_services import get_user
from services.invitation_services import validate_invitation, mark_invitation_used
from services.organization_invitation_service import handle_organization_invitation
from dto.schemas import InvitationCreate


ALGORITHM = "HS256"
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")  # generated with `openssl rand -hex 23
EMAIL_SALT = "email-confirmation-salt"
PASSWORD_RESET_SALT = "password-reset-salt"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 # TODO: must be define in var env
REFRESH_TOKEN_EXPIRE_DAYS = 30
VALIDATION_TOKEN_MAX_AGE = 60 * 60 * 24 * 7  # 7 days


serializer = URLSafeTimedSerializer(JWT_SECRET_KEY)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class CredentialsException(HTTPException):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )


class HTTPInvalidTokenError(HTTPException):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _should_be_admin(email: str) -> bool:
    return email.endswith(os.getenv("ADMIN_EMAIL", "@solight.ai"))


def get_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_tokens(email: str):
    access_token = create_access_token(data={"sub": email})
    refresh_token = create_refresh_token(data={"sub": email})
    return access_token, refresh_token

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "token_type": "access"})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire, "token_type": "refresh"})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=f"Bearer {token}",
        httponly=True,
        secure=True,  # Set to True if using HTTPS
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


async def get_current_user(token: str) -> UserModel:
    try:
        if len(token.split()) != 2:
            raise CredentialsException()

        payload = jwt.decode(token.split()[1], JWT_SECRET_KEY, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
        if email is None:
            logging.info("No email found in token, returning 401.")
            raise CredentialsException()
        
        # token_type = payload.get("token_type")
        # if token_type != "access":
        #     logging.warning("Token is not an access token. It's a " + str(token_type))
        #     raise HTTPInvalidTokenError()
    except jwt.InvalidTokenError:
        raise HTTPInvalidTokenError()

    user = await get_user(email=email)

    if user is None:
        logging.info("No user found with such email, returning 401.")
        raise CredentialsException()

    return user


async def refresh_access_token(refresh_token: str, response: Response) -> dict:
    """Generate a new access token using a refresh token"""
    try:
        payload = jwt.decode(refresh_token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        
        token_type = payload.get("token_type")
        if token_type != "refresh":
            logging.error(f"Invalid token type: {token_type}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token type. Expected refresh token."
            )
        
        email = payload.get("sub")
        if email is None:
            logging.error("Token missing 'sub' claim")
            raise HTTPInvalidTokenError()
                
        access_token = create_access_token(data={"sub": email})
        set_auth_cookie(response, access_token)
   
        return {
            "access_token": access_token,
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    
    except jwt.ExpiredSignatureError:
        logging.error("Refresh token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        logging.error(f"Invalid token: {str(e)}")
        raise HTTPInvalidTokenError()
    except Exception as e:
        logging.error(f"Unexpected error refreshing token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error refreshing token: {str(e)}",
        )


async def check_is_admin(user: UserModel) -> bool:
    """Check if a user is an admin, raise exception if not."""
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You need admin privileges for this action"
        )
    return True


def get_google_userinfo(google_access_token: str) -> dict:
    response = requests.get(
        "https://www.googleapis.com/oauth2/v1/userinfo",
        headers={"Authorization": f"Bearer {google_access_token}"},
        timeout=5,
    )

    if response.status_code != 200:
        logging.error(f"Failed to retrieve google user info: {response.status_code=} {response.text=}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="an error has occured")

    return response.json()


async def auth_google_callback(code: str, response: Response, invitation_code: Optional[str] = None) -> RedirectResponse:
    token_url = "https://accounts.google.com/o/oauth2/token"

    data = {
        "code": code,
        "client_id": os.getenv('GOOGLE_CLIENT_ID'),
        "client_secret": os.getenv('GOOGLE_CLIENT_SECRET'),
        "redirect_uri": os.getenv('GOOGLE_REDIRECT_URI'),
        "grant_type": "authorization_code",
    }

    token_response = requests.post(token_url, data=data, timeout=5)

    if token_response.status_code != 200:
        logging.warning(f"Received non-200 status code on google callback: {token_response.status_code=} {token_response.text=}")
        redirect_response = RedirectResponse(
            url=f"{os.getenv('APP_URL')}/auth/google/callback?error=auth_failed&error_description=Google authentication failed"
        )
        return redirect_response

    google_access_token = token_response.json().get("access_token")
    user_info = get_google_userinfo(google_access_token=google_access_token)

    user = await get_user(email=user_info["email"])

    if user is None:
        # For new users, we need a valid invitation code
        if _should_be_admin(user_info["email"]):
            from services.invitation_services import create_invitation  # avoid circular import
            invitation_code = (await create_invitation(
                invitation=InvitationCreate(
                    email=user_info["email"],
                    expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
                ),
                created_by_id=None,
            )).code if not invitation_code else invitation_code

        # For new users, we need a valid invitation code
        if not invitation_code:
            # Instead of throwing an exception, redirect to the frontend with error params
            redirect_response = RedirectResponse(
                url=f"{os.getenv('APP_URL')}/auth/google/callback?error=invitation_required&error_description=Invitation code required for registration"
            )
            return redirect_response

        # Validate the invitation code and check email match
        try:
            invitation = await validate_invitation(invitation_code, check_used=False)
            # Check if the email matches for individual invitations
            if invitation.email and invitation.email.lower() != user_info["email"].lower():
                redirect_response = RedirectResponse(
                    url=f"{os.getenv('APP_URL')}/auth/google/callback?error=email_mismatch&error_description=This invitation is for {invitation.email}. Please log in with that email address."
                )
                return redirect_response
        except Exception as e:
            redirect_response = RedirectResponse(
                url=f"{os.getenv('APP_URL')}/auth/google/callback?error=invitation_invalid&error_description={str(e)}"
            )
            return redirect_response

        # Create the user
        user = await UserModel.create(
            username=user_info["name"],
            email=user_info["email"],
            is_admin=_should_be_admin(user_info["email"]),
            onboarding_completed=False,  # Explicitly set onboarding to not completed for new users
        )

        # Mark the invitation as used
        await mark_invitation_used(invitation.code, user.id)

        # If the invitation has an organization, add the user to it
        if invitation.organization_id:
            try:
                success, message = await handle_organization_invitation(invitation_code, user)
                if not success:
                    redirect_response = RedirectResponse(
                        url=f"{os.getenv('APP_URL')}/auth/google/callback?error=join_failed&error_description={message}"
                    )
                    return redirect_response
            except HTTPException as e:
                redirect_response = RedirectResponse(
                    url=f"{os.getenv('APP_URL')}/auth/google/callback?error=join_failed&error_description={e.detail}"
                )
                return redirect_response
    else:
        # For existing users, check if there's an organization invitation
        if invitation_code:
            try:
                # First validate the invitation and check email match
                invitation = await validate_invitation(invitation_code)
                if invitation.email and invitation.email.lower() != user_info["email"].lower():
                    redirect_response = RedirectResponse(
                        url=f"{os.getenv('APP_URL')}/auth/google/callback?error=email_mismatch&error_description=This invitation is for {invitation.email}. Please log in with that email address."
                    )
                    return redirect_response

                # If email matches, process the invitation
                success, message = await handle_organization_invitation(invitation_code, user)
                logging.info(f"Organization invitation process result: {message}")
            except HTTPException as e:
                # Log the error but don't block the login
                logging.error(f"Failed to process organization invitation: {str(e)}")

    access_token, refresh_token = create_tokens(user.email)

    # Always redirect to the main app with the tokens
    redirect_url = f"{os.getenv('APP_URL')}/auth/google/callback?token={access_token}&refresh_token={refresh_token}&expires_in={ACCESS_TOKEN_EXPIRE_MINUTES * 60}"
    print("REDIRECTING TO: ", redirect_url)
    redirect_response = RedirectResponse(url=redirect_url)
    set_auth_cookie(redirect_response, access_token)

    return redirect_response


async def logout(response: Response) -> dict:
    response.delete_cookie(key="access_token")
    return {"message": "Successfully logged out"}