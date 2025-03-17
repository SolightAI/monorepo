import uuid
from typing import Dict, List, Optional
from fastapi import HTTPException, status
from pydantic import UUID4

from dto.models import Secret as SecretModel
from dto.models import SecretValue as SecretValueModel
from dto.models import SecretAccess as SecretAccessModel
from dto.schemas import SecretCreate, SecretUpdate, Secret, SecretWithValues
from utils.encryption import encryption_service


async def create_secret(data: SecretCreate, created_by_id: int) -> SecretWithValues:
    """
    Create a new secret with its values.

    Args:
        data: The secret data including values
        created_by_id: ID of the user creating the secret

    Returns:
        The created secret with its values
    """
    # Create the secret
    secret = await SecretModel.create(
        id=uuid.uuid4(),
        name=data.name,
        description=data.description,
        type=data.type,
        organization_id=data.organization_id,
        product_id=data.product_id,
        created_by_id=created_by_id,
        expires_at=data.expires_at
    )

    # Create secret values
    for key, value in data.values.items():
        encrypted_value = encryption_service.encrypt(value)
        await SecretValueModel.create(
            id=uuid.uuid4(),
            key=key,
            encrypted_value=encrypted_value,
            secret_id=secret.id
        )

    # Log the access
    await log_secret_access(secret.id, created_by_id, "create")

    # Return complete secret with values
    return await get_secret_with_values(secret.id)


async def get_secret(secret_id: UUID4) -> Secret:
    """
    Get a secret by ID without its values.

    Args:
        secret_id: ID of the secret

    Returns:
        The secret without values

    Raises:
        HTTPException: If the secret is not found
    """
    secret = await SecretModel.get_or_none(id=secret_id).prefetch_related("values")

    if not secret:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Secret not found"
        )

    return Secret.model_validate(secret)


async def get_secret_with_values(secret_id: UUID4) -> SecretWithValues:
    """
    Get a secret by ID with its decrypted values.

    Args:
        secret_id: ID of the secret

    Returns:
        The secret with decrypted values

    Raises:
        HTTPException: If the secret is not found
    """
    secret = await SecretModel.get_or_none(id=secret_id).prefetch_related("values")

    if not secret:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Secret not found"
        )

    # Decrypt values
    values = {}
    for value in secret.values:
        try:
            decrypted_value = encryption_service.decrypt(value.encrypted_value)
            values[value.key] = decrypted_value
        except ValueError:
            # Log this but continue with empty value
            values[value.key] = ""

    # Construct the response
    secret_dict = Secret.model_validate(secret).model_dump()
    return SecretWithValues(**secret_dict, values=values)


async def get_organization_secrets(organization_id: UUID4, product_id: Optional[UUID4] = None) -> List[Secret]:
    """
    Get all secrets for an organization, optionally filtered by product.

    Args:
        organization_id: ID of the organization
        product_id: Optional product ID to filter by

    Returns:
        List of secrets without values
    """
    query = SecretModel.filter(organization_id=organization_id)

    if product_id:
        query = query.filter(product_id=product_id)

    secrets = await query.prefetch_related("values")
    return [Secret.model_validate(secret) for secret in secrets]


async def update_secret(secret_id: UUID4, data: SecretUpdate, user_id: int) -> Secret:
    """
    Update a secret's metadata.

    Args:
        secret_id: ID of the secret to update
        data: The data to update
        user_id: ID of the user making the update

    Returns:
        The updated secret

    Raises:
        HTTPException: If the secret is not found
    """
    secret = await SecretModel.get_or_none(id=secret_id)

    if not secret:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Secret not found"
        )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(secret, key, value)

    await secret.save()

    # Log the access
    await log_secret_access(secret_id, user_id, "update")

    return await get_secret(secret_id)


async def update_secret_values(secret_id: UUID4, values: Dict[str, str], user_id: int) -> SecretWithValues:
    """
    Update a secret's values.

    Args:
        secret_id: ID of the secret
        values: Dictionary of key-value pairs to update
        user_id: ID of the user making the update

    Returns:
        The updated secret with values

    Raises:
        HTTPException: If the secret is not found
    """
    secret = await SecretModel.get_or_none(id=secret_id).prefetch_related("values")

    if not secret:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Secret not found"
        )

    # Create a map of existing values for lookup
    existing_values = {value.key: value for value in secret.values}

    # Update or create values
    for key, value in values.items():
        encrypted_value = encryption_service.encrypt(value)

        if key in existing_values:
            # Update existing value
            existing_values[key].encrypted_value = encrypted_value
            await existing_values[key].save()
        else:
            # Create new value
            await SecretValueModel.create(
                id=uuid.uuid4(),
                key=key,
                encrypted_value=encrypted_value,
                secret_id=secret_id
            )

    # Log the access
    await log_secret_access(secret_id, user_id, "update")

    return await get_secret_with_values(secret_id)


async def delete_secret(secret_id: UUID4, user_id: int) -> bool:
    """
    Delete a secret and its values.

    Args:
        secret_id: ID of the secret to delete
        user_id: ID of the user performing the deletion

    Returns:
        True if successful

    Raises:
        HTTPException: If the secret is not found
    """
    secret = await SecretModel.get_or_none(id=secret_id).prefetch_related("values", "access_logs")

    if not secret:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Secret not found"
        )

    # Log the access before deletion
    await log_secret_access(secret_id, user_id, "delete")

    # Delete all values
    for value in secret.values:
        await value.delete()

    # Delete all access logs
    for log in secret.access_logs:
        await log.delete()

    # Delete the secret
    await secret.delete()

    return True


async def log_secret_access(secret_id: UUID4, user_id: int, action: str) -> SecretAccessModel:
    """
    Log access to a secret.

    Args:
        secret_id: ID of the accessed secret
        user_id: ID of the user accessing the secret
        action: Type of action performed

    Returns:
        The created access log
    """
    return await SecretAccessModel.create(
        id=uuid.uuid4(),
        secret_id=secret_id,
        user_id=user_id,
        action=action
    )


async def get_secret_access_logs(secret_id: UUID4) -> List[SecretAccessModel]:
    """
    Get access logs for a secret.

    Args:
        secret_id: ID of the secret

    Returns:
        List of access logs

    Raises:
        HTTPException: If the secret is not found
    """
    # Check if secret exists
    secret = await SecretModel.get_or_none(id=secret_id)

    if not secret:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Secret not found"
        )

    # Get access logs
    logs = await SecretAccessModel.filter(secret_id=secret_id).order_by("-accessed_at")
    return logs
