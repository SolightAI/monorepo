import uuid
import random
import string

from datetime import datetime, timezone
from typing import Optional, List
from fastapi import HTTPException, status
from dto.models import Invitation as InvitationModel
from dto.schemas import InvitationCreate
from uuid import uuid4


def generate_unique_code(length: int = 10) -> str:
    """Generate a random alphanumeric code of specified length."""
    chars = string.ascii_uppercase + string.ascii_lowercase + string.digits
    return ''.join(random.choice(chars) for _ in range(length))


async def create_invitation(
    invitation: InvitationCreate,
    created_by_id: Optional[int] = None,
) -> InvitationModel:
    """Create a new invitation."""

    # Generate a unique code
    code = str(uuid4())

    # Check if code already exists
    if await InvitationModel.filter(code=code).exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation code already exists"
        )

    # Create the invitation
    invitation_obj = await InvitationModel.create(
        id=uuid.uuid4(),
        code=code,
        email=invitation.email,
        expires_at=invitation.expires_at,
        created_by_id=created_by_id,
    )

    return await get_invitation(invitation_obj.id)


async def get_invitation(invitation_id: uuid.UUID) -> InvitationModel:
    """Get an invitation by ID."""
    invitation = await InvitationModel.get_or_none(id=invitation_id)
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )

    return invitation


async def get_invitation_by_code(code: str) -> InvitationModel:
    """Get an invitation by code."""
    invitation = await InvitationModel.get_or_none(code=code)
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )

    return invitation


async def get_all_invitations() -> List[InvitationModel]:
    """Get all invitations."""
    return await InvitationModel.all().prefetch_related('created_by', 'used_by')


async def validate_invitation(code: str, email: Optional[str] = None) -> InvitationModel:
    """Validate an invitation code."""
    # Get the invitation
    invitation = await InvitationModel.get_or_none(code=code)

    # Check if invitation exists
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invitation code"
        )

    # Check if invitation is already used
    if invitation.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation code has already been used"
        )

    # Check if invitation has expired
    if invitation.expires_at and invitation.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation code has expired"
        )

    # Check if the invitation is for a specific email
    if invitation.email and email and invitation.email.lower() != email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation code is not valid for this email address"
        )

    return invitation


async def mark_invitation_used(invitation: InvitationModel, user_id: int) -> InvitationModel:
    """Mark an invitation as used by a specific user."""
    invitation.used = True
    invitation.used_at = datetime.now(timezone.utc)
    invitation.used_by_id = user_id
    await invitation.save()

    return invitation


async def delete_invitation(invitation_id: uuid.UUID | str) -> None:
    """Delete an invitation."""
    await InvitationModel.filter(id=invitation_id).delete()
