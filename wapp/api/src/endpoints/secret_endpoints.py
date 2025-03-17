from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import UUID4

from dependencies import get_current_user
from dto.models import User
from dto.schemas import (
    Secret,
    SecretCreate,
    SecretUpdate,
    SecretWithValues,
    SecretAccess,
)
from services import organization_services, secret_services


router = APIRouter(
    prefix="/secrets",
    tags=["secrets"],
)


@router.post("", response_model=SecretWithValues, status_code=status.HTTP_201_CREATED)
async def create_secret(
    data: SecretCreate,
    current_user: User = Depends(get_current_user)
) -> SecretWithValues:
    """
    Create a new secret with values.

    The user must be a member of the organization with appropriate permissions.
    """
    # Check if user has permission to create secrets in this organization
    member = await organization_services.get_organization_member(
        data.organization_id, current_user.id
    )

    if not member or member.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create secrets in this organization"
        )

    return await secret_services.create_secret(data, current_user.id)


@router.get("", response_model=List[Secret])
async def get_secrets(
    organization_id: UUID4 = Query(..., description="Organization ID to filter secrets by"),
    product_id: Optional[UUID4] = Query(None, description="Optional Product ID to filter secrets by"),
    current_user: User = Depends(get_current_user)
) -> List[Secret]:
    """
    Get all secrets for an organization, optionally filtered by product.

    The user must be a member of the organization.
    """
    # Check if user is a member of the organization
    member = await organization_services.get_organization_member(
        organization_id, current_user.id
    )

    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view secrets in this organization"
        )

    return await secret_services.get_organization_secrets(organization_id, product_id)


@router.get("/{secret_id}", response_model=Secret)
async def get_secret(
    secret_id: UUID4,
    current_user: User = Depends(get_current_user)
) -> Secret:
    """
    Get a secret by ID without its values.

    The user must be a member of the organization that owns the secret.
    """
    # First, get the secret to check organization
    secret = await secret_services.get_secret(secret_id)

    # Check if user is a member of the organization
    member = await organization_services.get_organization_member(
        secret.organization_id, current_user.id
    )

    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this secret"
        )

    # Log access
    await secret_services.log_secret_access(secret_id, current_user.id, "view")

    return secret


@router.get("/{secret_id}/values", response_model=SecretWithValues)
async def get_secret_values(
    secret_id: UUID4,
    current_user: User = Depends(get_current_user)
) -> SecretWithValues:
    """
    Get a secret by ID with its decrypted values.

    The user must be a member of the organization that owns the secret.
    """
    # First, get the secret to check organization
    secret = await secret_services.get_secret(secret_id)

    # Check if user is a member of the organization with appropriate role
    member = await organization_services.get_organization_member(
        secret.organization_id, current_user.id
    )

    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this secret"
        )

    # For more sensitive operations like viewing values, require higher permissions
    if member.role == "guest":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view secret values"
        )

    # Log access
    await secret_services.log_secret_access(secret_id, current_user.id, "view_values")

    return await secret_services.get_secret_with_values(secret_id)


@router.put("/{secret_id}", response_model=Secret)
async def update_secret(
    secret_id: UUID4,
    data: SecretUpdate,
    current_user: User = Depends(get_current_user)
) -> Secret:
    """
    Update a secret's metadata.

    The user must be an owner or admin of the organization that owns the secret.
    """
    # First, get the secret to check organization
    secret = await secret_services.get_secret(secret_id)

    # Check if user is a member of the organization with appropriate role
    member = await organization_services.get_organization_member(
        secret.organization_id, current_user.id
    )

    if not member or member.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this secret"
        )

    return await secret_services.update_secret(secret_id, data, current_user.id)


@router.put("/{secret_id}/values", response_model=SecretWithValues)
async def update_secret_values(
    secret_id: UUID4,
    values: Dict[str, str],
    current_user: User = Depends(get_current_user)
) -> SecretWithValues:
    """
    Update a secret's values.

    The user must be an owner or admin of the organization that owns the secret.
    """
    # First, get the secret to check organization
    secret = await secret_services.get_secret(secret_id)

    # Check if user is a member of the organization with appropriate role
    member = await organization_services.get_organization_member(
        secret.organization_id, current_user.id
    )

    if not member or member.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this secret"
        )

    return await secret_services.update_secret_values(secret_id, values, current_user.id)


@router.delete("/{secret_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_secret(
    secret_id: UUID4,
    current_user: User = Depends(get_current_user)
) -> Response:
    """
    Delete a secret and its values.

    The user must be an owner or admin of the organization that owns the secret.
    """
    # First, get the secret to check organization
    secret = await secret_services.get_secret(secret_id)

    # Check if user is a member of the organization with appropriate role
    member = await organization_services.get_organization_member(
        secret.organization_id, current_user.id
    )

    if not member or member.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this secret"
        )

    await secret_services.delete_secret(secret_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{secret_id}/access-logs", response_model=List[SecretAccess])
async def get_secret_access_logs(
    secret_id: UUID4,
    current_user: User = Depends(get_current_user)
) -> List[SecretAccess]:
    """
    Get access logs for a secret.

    The user must be an owner or admin of the organization that owns the secret.
    """
    # First, get the secret to check organization
    secret = await secret_services.get_secret(secret_id)

    # Check if user is a member of the organization with appropriate role
    member = await organization_services.get_organization_member(
        secret.organization_id, current_user.id
    )

    if not member or member.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view access logs"
        )

    return await secret_services.get_secret_access_logs(secret_id)
