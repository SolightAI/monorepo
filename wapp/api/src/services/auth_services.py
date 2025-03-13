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
from dto.schemas import InvitationCreate


ALGORITHM = "HS256"
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")  # generated with `openssl rand -hex 23
EMAIL_SALT = "email-confirmation-salt"
PASSWORD_RESET_SALT = "password-reset-salt"

ACCESS_TOKEN_EXPIRE_MINUTES = 30
VALIDATION_TOKEN_MAX_AGE = 60 * 60 * 24 * 7  # 7 days


serializer = URLSafeTimedSerializer(JWT_SECRET_KEY)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class CredentialsException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )


class HTTPInvalidTokenError(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _should_be_admin(email: str):
    print("ADMIN EMAIL: ", os.getenv("ADMIN_EMAIL", "@laneo.io"))
    print("EMAIL: ", email)
    print("ENDING WITH: ", email.endswith(os.getenv("ADMIN_EMAIL", "@laneo.io")))
    return email.endswith(os.getenv("ADMIN_EMAIL", "@laneo.io"))


def get_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)


def set_auth_cookie(response: Response, token: str):
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
        payload = jwt.decode(token.split()[1], JWT_SECRET_KEY, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
        if email is None:
            logging.info("No email found in token, returning 401.")
            raise CredentialsException()
    except jwt.InvalidTokenError:
        raise HTTPInvalidTokenError()

    user = await get_user(email=email)

    if user is None:
        logging.info("No user found with such email, returning 401.")
        raise CredentialsException()

    return user


async def check_is_admin(user: UserModel) -> bool:
    """Check if a user is an admin, raise exception if not."""
    print("USER IS ADMIN: ", user.is_admin)
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You need admin privileges for this action"
        )
    return True


def get_google_userinfo(google_access_token: str):
    response = requests.get(
        "https://www.googleapis.com/oauth2/v1/userinfo",
        headers={"Authorization": f"Bearer {google_access_token}"},
        timeout=5,
    )

    if response.status_code != 200:
        logging.error(f"Failed to retrieve google user info: {response.status_code=} {response.text=}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="an error has occured")

    return response.json()


async def auth_google_callback(code: str, response: Response, invitation_code: Optional[str] = None):
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

        if _should_be_admin(user_info["email"]):
            from services.invitation_services import create_invitation  # avoid circular import
            invitation_code = (await create_invitation(
                invitation=InvitationCreate(
                    email=user_info["email"],
                    expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
                ),
                created_by_id=None,
            )).code

        # For new users, we need a valid invitation code
        if not invitation_code:
            # Instead of throwing an exception, redirect to the frontend with error params
            redirect_response = RedirectResponse(
                url=f"{os.getenv('APP_URL')}/auth/google/callback?error=invitation_required&error_description=Invitation code required for registration"
            )
            return redirect_response

        # Validate the invitation code
        try:
            invitation = await validate_invitation(invitation_code, user_info["email"])
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
        )

        # Mark the invitation as used
        await mark_invitation_used(invitation, user.id)

        # If the invitation has an organization, add the user to it
        if invitation.organization_id and invitation.role:
            from services.organization_services import add_member_to_organization
            from dto.schemas import OrganizationMemberCreate

            await add_member_to_organization(
                organization_id=invitation.organization_id,
                data=OrganizationMemberCreate(
                    user_id=user.id,
                    role=invitation.role,
                    invited_by_id=invitation.created_by_id
                )
            )

    # Create JWT access token
    jwt_token = create_access_token(data={
        "sub": user.email,
    })

    print("REDIRECTING TO: ", f"{os.getenv('APP_URL')}/auth/google/callback?token={jwt_token}")
    redirect_response = RedirectResponse(
        url=f"{os.getenv('APP_URL')}/auth/google/callback?token={jwt_token}"
    )
    set_auth_cookie(redirect_response, jwt_token)

    return redirect_response


async def refresh_google_token(refresh_token):
    token_url = "https://accounts.google.com/o/oauth2/token"

    data = {
        "client_id": os.getenv('GOOGLE_CLIENT_ID'),
        "client_secret": os.getenv('GOOGLE_CLIENT_SECRET'),
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }

    response = requests.post(token_url, data=data, timeout=5)

    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to refresh Google token")

    tokens = response.json()

    return {
        "access_token": tokens["access_token"],
        "expires_in": tokens["expires_in"],
        "expires_at": (datetime.now(timezone.utc) + timedelta(seconds=tokens["expires_in"])).isoformat()
    }


async def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": "Successfully logged out"}
