from fastapi import APIRouter, Depends
from typing import List, Optional
from dto.schemas import Invitation, InvitationCreate
from services.invitation_services import (
    create_invitation,
    get_invitation_by_code,
    get_all_invitations,
    validate_invitation,
    mark_invitation_used,
    delete_invitation
)
from services.auth_services import check_is_admin
from dependencies import get_current_user
from dto.models import User


router = APIRouter(prefix="/invitations", tags=["invitations"])


@router.get("/")
async def get_invitations_endpoint(
    current_user: User = Depends(get_current_user)
) -> List[Invitation]:
    """Get all invitations. Requires admin privileges."""
    await check_is_admin(current_user)
    return await get_all_invitations()


@router.post("/")
async def create_invitation_endpoint(
    invitation: InvitationCreate,
    current_user: User = Depends(get_current_user)
) -> Invitation:
    """Create a new invitation. Requires admin privileges."""

    await check_is_admin(current_user)

    return await create_invitation(
        invitation=invitation,
        created_by_id=current_user.id
    )


@router.get("/validate/{code}")
async def validate_invitation_endpoint(
    code: str,
    email: Optional[str] = None
) -> Invitation:
    """Validate an invitation code. Can be used without authentication."""
    return await validate_invitation(code, email)


@router.post("/mark-used/{code}")
async def mark_invitation_used_endpoint(
    code: str,
    current_user: User = Depends(get_current_user)
) -> Invitation:
    """Mark an invitation as used. Requires authentication."""
    invitation = await get_invitation_by_code(code)
    return await mark_invitation_used(invitation, current_user.id)


@router.delete("/{code}")
async def delete_invitation_endpoint(
    code: str,
    current_user: User = Depends(get_current_user)
) -> None:
    """Delete an invitation. Requires admin privileges."""
    await check_is_admin(current_user)
    return await delete_invitation(code)
