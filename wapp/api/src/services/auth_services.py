import os
import logging
import requests
from typing import Optional
import msal  # Import MSAL library

from dto.models import User as UserModel
from passlib.context import CryptContext
from fastapi.responses import RedirectResponse
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status, Response
from itsdangerous import URLSafeTimedSerializer
from services.user_services import get_user
from services.invitation_services import validate_invitation, mark_invitation_used
from services.organization_invitation_service import handle_organization_invitation
from dto.schemas import InvitationCreate, UserCreate as UserCreateSchema
from jose import jwt, JWTError, ExpiredSignatureError  # Changed import


ALGORITHM = "HS256"
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")  # generated with `openssl rand -hex 23
EMAIL_SALT = "email-confirmation-salt"
PASSWORD_RESET_SALT = "password-reset-salt"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 30
VALIDATION_TOKEN_MAX_AGE = 60 * 60 * 24 * 7  # 7 days

if not JWT_SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY environment variable not set")

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


# Custom Exception for redirecting within the OAuth flow
class RedirectException(Exception):
    def __init__(self, url: str):
        self.url = url
        super().__init__(f"Redirecting to {url}")


def _should_be_admin(email: str) -> bool:
    return email.endswith(os.getenv("ADMIN_EMAIL", "@solight.ai"))


def get_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_tokens(email: str) -> tuple[str, str]:
    access_token = create_access_token(data={"sub": email})
    refresh_token = create_refresh_token(data={"sub": email})
    return access_token, refresh_token


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "token_type": "access"})
    if not JWT_SECRET_KEY:
        raise ValueError("JWT_SECRET_KEY environment variable not set")
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire, "token_type": "refresh"})
    if not JWT_SECRET_KEY:
        raise ValueError("JWT_SECRET_KEY environment variable not set")
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=f"Bearer {token}",
        httponly=True,
        secure=True,  # Set to True if using HTTPS
        samesite="lax",
        max_age=int(ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    )


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=True,  # Set to True if using HTTPS
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )


async def get_current_user(token: str) -> UserModel:
    try:
        if len(token.split()) != 2:
            raise CredentialsException()

        if not JWT_SECRET_KEY:
            raise ValueError("JWT_SECRET_KEY environment variable not set")

        payload = jwt.decode(token.split()[1], JWT_SECRET_KEY, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
        if email is None:
            logging.info("No email found in token, returning 401.")
            raise CredentialsException()

    except JWTError:
        raise HTTPInvalidTokenError()

    user = await get_user(email=email)

    if user is None:
        logging.info("No user found with such email, returning 401.")
        raise CredentialsException()

    return user


async def refresh_access_token(refresh_token: str, response: Response) -> dict:
    """Generate a new access token using a refresh token"""
    try:

        if not JWT_SECRET_KEY:
            raise ValueError("JWT_SECRET_KEY environment variable not set")

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

    except ExpiredSignatureError:
        logging.error("Refresh token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
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


async def _process_oauth_user(user_info: dict, invitation_code: Optional[str], provider_name: str) -> UserModel:
    """Handles user lookup/creation and invitation logic for OAuth callbacks."""

    email = user_info.get("email")

    if email is None:
        logging.error(f"{provider_name} callback: Email not found in user info.")
        raise RuntimeError(f"{provider_name} callback: Email not found in user info.")

    name = user_info.get("name", email.split('@')[0])  # Use email prefix if name not provided

    if not email:
        logging.error(f"{provider_name} callback: Email not found in user info.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{provider_name} profile did not return an email.")

    user = await get_user(email=email)
    frontend_callback_base_url = f"{os.getenv('APP_URL')}/auth/callback"  # Use a generic callback path

    if user is None:
        # New user: Check for admin status or invitation
        if _should_be_admin(email):
            from services.invitation_services import create_invitation  # Avoid circular import
            if not invitation_code:
                invitation_code = (
                    await create_invitation(
                        invitation=InvitationCreate(
                            email=email,
                            expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),  # Slightly longer expiry
                        ),
                        created_by_id=None,
                    )
                ).code

        if not invitation_code:
            error_query = "error=invitation_required&error_description=Invitation code required for registration"
            raise RedirectException(f"{frontend_callback_base_url}?{error_query}")

        # Validate invitation
        try:
            invitation = await validate_invitation(invitation_code, check_used=False)
            if invitation.email and invitation.email.lower() != email.lower():
                error_query = f"error=email_mismatch&error_description=This invitation is for {invitation.email}. Please log in with that email address."
                raise RedirectException(f"{frontend_callback_base_url}?{error_query}")
        except HTTPException as e:
            error_query = f"error=invitation_invalid&error_description={e.detail}"
            raise RedirectException(f"{frontend_callback_base_url}?{error_query}")
        except Exception as e:  # Catch broader exceptions during validation
            logging.error(f"Invitation validation error: {e}")
            error_query = "error=invitation_error&error_description=Could not validate invitation code."
            raise RedirectException(f"{frontend_callback_base_url}?{error_query}")

        # Create user
        user = await UserModel.create(
            username=name,
            email=email,
            is_admin=_should_be_admin(email),
            onboarding_completed=False,
        )
        logging.info(f"New user created via {provider_name}: {email}")

        # Mark invitation used & handle organization
        await mark_invitation_used(invitation.code, user.id)
        if invitation.organization_id is not None:
            try:
                success, message = await handle_organization_invitation(invitation.code, user)
                if not success:
                    logging.warning(f"Failed to add user {user.email} to organization via invite {invitation.code}: {message}")
            except Exception as e:
                logging.error(f"Error processing organization invitation for new user {user.email}: {str(e)}")
    else:
        # Existing user: Process potential organization invitation
        logging.info(f"Existing user logged in via {provider_name}: {email}")
        if invitation_code:
            try:
                invitation = await validate_invitation(invitation_code)
                if invitation.email and invitation.email.lower() != email.lower():
                    logging.warning(f"Invitation email mismatch for existing user {email}. Invitation for {invitation.email}")
                    # Don't block login, but log the mismatch
                else:
                    # Process valid org invitation for existing user
                    success, message = await handle_organization_invitation(invitation_code, user)
                    logging.info(f"Organization invitation processing for {email}: {message}")
                    if not success:
                        # Log failure but don't block login
                        logging.error(f"Failed to add existing user {email} to org via invite {invitation_code}: {message}")
            except HTTPException as e:
                logging.error(f"Failed to process organization invitation for existing user {email}: {e.detail}")

    return user


async def auth_google_callback(code: str, response: Response, invitation_code: Optional[str] = None) -> RedirectResponse:
    frontend_callback_base_url = f"{os.getenv('APP_URL')}/auth/callback"
    try:
        token_url = "https://accounts.google.com/o/oauth2/token"
        data = {
            "code": code,
            "client_id": os.getenv('GOOGLE_CLIENT_ID'),
            "client_secret": os.getenv('GOOGLE_CLIENT_SECRET'),
            "redirect_uri": os.getenv('GOOGLE_REDIRECT_URI'),
            "grant_type": "authorization_code",
        }
        token_response = requests.post(token_url, data=data, timeout=10)  # Increased timeout slightly

        if token_response.status_code != 200:
            logging.warning(f"Google token exchange failed: {token_response.status_code=} {token_response.text=}")
            error_query = "error=google_auth_failed&error_description=Could not exchange code for token"
            raise RedirectException(f"{frontend_callback_base_url}?{error_query}")

        token_data = token_response.json()
        google_access_token = token_data.get("access_token")
        # TODO: Optionally store refresh_token if needed later

        user_info = get_google_userinfo(google_access_token=google_access_token)

        # Use the refactored user processing logic
        user = await _process_oauth_user(user_info, invitation_code, "Google")

        # Create JWT access and refresh tokens
        access_token, refresh_token = create_tokens(user.email)
        expires_in = ACCESS_TOKEN_EXPIRE_MINUTES * 60

        # Successful login, redirect to frontend with token and expiry info
        redirect_url = f"{frontend_callback_base_url}?token={access_token}&expires_in={expires_in}"
        logging.info(f"Google login successful for {user.email}, redirecting to frontend.")
        redirect_response = RedirectResponse(url=redirect_url)
        set_auth_cookie(redirect_response, access_token)
        set_refresh_cookie(redirect_response, refresh_token)
        return redirect_response

    except RedirectException as re:
        # Handle planned redirects (e.g., invitation errors)
        logging.info(f"Redirecting from Google callback: {re.url}")
        return RedirectResponse(url=re.url)
    except HTTPException as he:
        # Handle errors raised during user info fetch or processing
        logging.error(f"HTTP Exception during Google callback: {he.detail}")
        error_query = f"error=google_processing_failed&error_description={he.detail}"
        return RedirectResponse(url=f"{frontend_callback_base_url}?{error_query}")
    except Exception as e:
        # Catch unexpected errors
        logging.exception(f"Unexpected error during Google callback: {e}")  # Log full traceback
        error_query = "error=google_internal_error&error_description=An unexpected error occurred"
        return RedirectResponse(url=f"{frontend_callback_base_url}?{error_query}")


async def auth_azure_callback(code: str, response: Response, invitation_code: Optional[str] = None) -> RedirectResponse:
    """Handles the Azure AD OAuth callback, exchanges code for token, gets user info, and manages user session."""
    frontend_callback_base_url = f"{os.getenv('APP_URL')}/auth/callback"
    try:
        client_id = os.getenv('AZURE_CLIENT_ID')
        client_secret = os.getenv('AZURE_CLIENT_SECRET')
        tenant_id = os.getenv('AZURE_TENANT_ID')
        redirect_uri = os.getenv('AZURE_REDIRECT_URI')
        authority = f"https://login.microsoftonline.com/{tenant_id}"
        # MSAL handles openid, profile, offline_access automatically.
        # Only specify additional resource scopes needed.
        scope = ["email", "User.Read"]

        if not all([client_id, client_secret, tenant_id, redirect_uri]):
            logging.error("Azure AD environment variables not configured.")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Azure AD configuration missing.")

        app = msal.ConfidentialClientApplication(
            client_id,
            authority=authority,
            client_credential=client_secret,
            # token_cache=... # Optional: Add token caching for better performance/scalability
        )

        # Exchange authorization code for tokens
        result = app.acquire_token_by_authorization_code(
            code,
            scopes=scope,
            redirect_uri=redirect_uri
        )

        if "error" in result:
            logging.warning(f"Azure AD token acquisition error: {result.get('error_description')}")
            error_query = f"error=azure_auth_failed&error_description={result.get('error_description', 'Failed to acquire token')}"
            raise RedirectException(f"{frontend_callback_base_url}?{error_query}")

        # Decode the ID token to get user information
        id_token_claims = result.get('id_token_claims')
        if not id_token_claims:
            logging.error("Azure AD response missing id_token_claims.")
            error_query = "error=azure_auth_failed&error_description=ID token missing from response"
            raise RedirectException(f"{frontend_callback_base_url}?{error_query}")

        user_info = {
            "email": id_token_claims.get("email") or id_token_claims.get("preferred_username"),  # Fallback to preferred_username
            "name": id_token_claims.get("name"),
            # Add other relevant claims if needed, e.g., oid for Azure Object ID
            "azure_oid": id_token_claims.get("oid")
        }

        if not user_info["email"]:
            logging.error("Email could not be obtained from Azure AD token claims.")
            error_query = "error=azure_auth_failed&error_description=Email address not found in Azure profile"
            raise RedirectException(f"{frontend_callback_base_url}?{error_query}")

        # Use the refactored user processing logic
        user = await _process_oauth_user(user_info, invitation_code, "AzureAD")

        # Create JWT access and refresh tokens
        access_token, refresh_token = create_tokens(user.email)
        expires_in = ACCESS_TOKEN_EXPIRE_MINUTES * 60

        # Successful login, redirect to frontend with token and expiry info
        redirect_url = f"{frontend_callback_base_url}?token={access_token}&expires_in={int(expires_in)}"
        logging.info(f"Azure AD login successful for {user.email}, redirecting to frontend.")
        redirect_response = RedirectResponse(url=redirect_url)
        set_auth_cookie(redirect_response, access_token)
        set_refresh_cookie(redirect_response, refresh_token)
        return redirect_response

    except RedirectException as re:
        # Handle planned redirects (e.g., invitation errors)
        logging.info(f"Redirecting from Azure callback: {re.url}")
        return RedirectResponse(url=re.url)
    except HTTPException as he:
        # Handle errors raised during user processing
        logging.error(f"HTTP Exception during Azure callback: {he.detail}")
        error_query = f"error=azure_processing_failed&error_description={he.detail}"
        return RedirectResponse(url=f"{frontend_callback_base_url}?{error_query}")
    except Exception as e:
        # Catch unexpected errors (e.g., MSAL library errors, network issues)
        logging.exception(f"Unexpected error during Azure callback: {e}")
        error_query = "error=azure_internal_error&error_description=An unexpected error occurred"
        return RedirectResponse(url=f"{frontend_callback_base_url}?{error_query}")


async def logout(response: Response) -> dict:
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token")
    return {"message": "Successfully logged out"}


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


async def authenticate_user(email: str, password: str, invitation_code: Optional[str] = None) -> Optional[UserModel]:
    logging.info(f"Authenticating user: {email}, invitation_code: {invitation_code if invitation_code else 'N/A'}")
    user = await get_user(email=email)
    if not user:
        logging.warning(f"Authentication failed: User not found for email {email}")
        return None
    if not user.hashed_password or not verify_password(password, user.hashed_password):
        logging.warning(f"Authentication failed: Invalid password for user {email}")
        return None

    logging.info(f"User {email} authenticated successfully.")

    if invitation_code and user:
        logging.info(f"Processing invitation_code {invitation_code} for user {email} during login.")
        try:
            invitation = await validate_invitation(invitation_code, check_used=False)
            logging.info(f"Invitation {invitation_code} validated for user {email}. Details: {invitation}")

            if invitation.email and invitation.email.lower() != user.email.lower():
                logging.warning(f"User {user.email} attempted to use invitation {invitation_code} meant for {invitation.email} during login.")
            else:
                if invitation.organization_id is not None:
                    logging.info(f"Invitation {invitation_code} is for organization {invitation.organization_id}. Attempting to handle for user {email}.")
                    try:
                        success, message = await handle_organization_invitation(invitation.code, user)
                        if success:
                            logging.info(f"Successfully processed organization invitation {invitation.code} for user {user.email}: {message}")
                            if not invitation.used:
                                await mark_invitation_used(invitation.code, user.id)
                                logging.info(f"Marked organization invitation {invitation.code} as used by user {user.email}.")
                        else:
                            logging.warning(f"Failed to process organization invitation {invitation.code} for user {user.email}: {message}")
                    except Exception as e_org_inv:
                        logging.error(f"Error processing organization invitation {invitation.code} for user {user.email} during login: {str(e_org_inv)}")
                elif not invitation.used:
                    await mark_invitation_used(invitation.code, user.id)
                    logging.info(f"User {user.email} successfully used product invitation {invitation.code} during login and marked as used.")
                elif invitation.used:
                    logging.info(f"Product invitation {invitation.code} already used. User: {invitation.used_by_id}, Time: {invitation.used_at}")

        except HTTPException as e_http_inv:
            logging.warning(f"User {user.email} authenticated, but provided invitation code {invitation_code} had an issue during login: {e_http_inv.detail}")
        except Exception as e_inv_generic:
            logging.error(f"Unexpected error processing invitation_code {invitation_code} for user {user.email} during login: {str(e_inv_generic)}")
    return user


async def create_user_account(user_data: UserCreateSchema) -> UserModel:
    logging.info(f"Attempting to create user account for email: {user_data.email}, with invitation_code: {user_data.invitation_code if user_data.invitation_code else 'N/A'}")
    existing_user = await get_user(email=user_data.email)
    if existing_user:
        logging.warning(f"User creation failed: Email {user_data.email} already registered.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Password validation
    if len(user_data.password) < 7:
        logging.warning(f"User creation failed for email {user_data.email}: Password too short.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 7 characters long."
        )

    invitation = None
    if user_data.invitation_code:
        logging.info(f"Processing invitation_code {user_data.invitation_code} for new user {user_data.email}.")
        try:
            invitation = await validate_invitation(user_data.invitation_code, check_used=False)
            logging.info(f"Invitation {user_data.invitation_code} validated for new user {user_data.email}. Details: {invitation}")
            if invitation.email and invitation.email.lower() != user_data.email.lower():
                logging.warning(f"User creation failed: Invitation {user_data.invitation_code} is for {invitation.email}, but registration is for {user_data.email}.")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"The invitation code is for {invitation.email}, but you are registering with {user_data.email}."
                )
        except HTTPException as e_val:
            logging.warning(f"User creation failed: Invitation validation error for code {user_data.invitation_code}. Details: {e_val.detail}")
            raise e_val
        except Exception as e_inv:
            logging.error(f"Unexpected error validating invitation code {user_data.invitation_code} during registration: {str(e_inv)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred while validating the invitation code. Please try again."
            )

    logging.info(f"Proceeding to create user {user_data.email} after invitation processing (if any).")
    hashed_password = get_hash(user_data.password)
    new_user = await UserModel.create(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        is_admin=_should_be_admin(user_data.email),
        onboarding_completed=False
    )
    logging.info(f"User {new_user.email} (ID: {new_user.id}) created successfully.")

    if invitation:
        logging.info(f"Marking invitation {invitation.code} as used by user {new_user.id}.")
        await mark_invitation_used(invitation.code, new_user.id)
        if invitation.organization_id is not None:
            logging.info(f"Invitation {invitation.code} also for organization {invitation.organization_id}. Attempting to handle for new user {new_user.email}.")
            try:
                success, message = await handle_organization_invitation(invitation.code, new_user)
                if success:
                    logging.info(f"Successfully processed organization part of invitation {invitation.code} for new user {new_user.email}: {message}")
                else:
                    logging.warning(f"Failed to process organization part of invitation {invitation.code} for new user {new_user.email}: {message}")
            except Exception as e_org_handle:
                logging.error(f"Error processing organization part of invitation {invitation.code} for new user {new_user.email}: {str(e_org_handle)}")

    return new_user
