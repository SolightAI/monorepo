from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from uuid import UUID
from dto.schemas import Invitation, InvitationCreate, OrganizationRole
from services.invitation_services import (
    create_invitation,
    get_all_invitations,
    validate_invitation,
    mark_invitation_used,
    delete_invitation,
    get_invitation
)
from services import organization_services
from services.auth_services import check_is_admin
from dependencies import get_current_user_dependency
from dto.models import User


router = APIRouter(prefix="/invitations", tags=["invitations"])


@router.get("/")
async def get_invitations_endpoint(
    organization_id: Optional[UUID] = Query(None, description="Filter invitations by organization ID"),
    current_user: User = Depends(get_current_user_dependency)
) -> List[Invitation]:
    """
    Get all invitations.

    If organization_id is provided, only invitations for that organization will be returned.
    The user must be an admin or an owner/admin of the organization.
    """
    if organization_id:
        # Check if user is a member of the organization with appropriate permissions
        member = await organization_services.get_organization_member(
            organization_id, current_user.id
        )
        if not member or member.role not in ["owner", "admin"]:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to view invitations for this organization"
            )
        return await get_all_invitations(organization_id=organization_id)
    else:
        # For global invitations, require admin privileges
        await check_is_admin(current_user)
        return await get_all_invitations()


@router.post("/")
async def create_invitation_endpoint(
    invitation: InvitationCreate,
    current_user: User = Depends(get_current_user_dependency)
) -> Invitation:
    """
    Create a new invitation.

    If organization_id is provided, the user must be an owner or admin of the organization.
    Otherwise, the user must be a global admin.
    """
    if invitation.organization_id:
        # Check if user is a member of the organization with appropriate permissions
        member = await organization_services.get_organization_member(
            invitation.organization_id, current_user.id
        )
        if not member or member.role not in ["owner", "admin"]:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to create invitations for this organization"
            )

        # Define role hierarchy for comparison
        role_hierarchy = {
            OrganizationRole.OWNER: 4,
            OrganizationRole.ADMIN: 3,
            OrganizationRole.MEMBER: 2,
            OrganizationRole.GUEST: 1,
        }

        # Set a default role if not provided, otherwise validate the requested role
        if not invitation.role:
            invitation.role = OrganizationRole.MEMBER
        else:
            # Check if the invited role is higher than the inviter's role
            inviter_level = role_hierarchy.get(member.role, 0)  # by security, we set the default to lowest
            invited_level = role_hierarchy.get(invitation.role, 9)  # by security, we set the default to highest

            if invited_level > inviter_level:
                raise HTTPException(
                    status_code=403,
                    detail="You cannot invite a member with a role higher than your own",
                )
    else:
        # For global invitations, require admin privileges
        await check_is_admin(current_user)

    return await create_invitation(
        invitation=invitation,
        created_by_id=current_user.id
    )


@router.get("/validate/{code}/")
async def validate_invitation_endpoint(
    code: str,
    email: Optional[str] = None
) -> Invitation:
    """Validate an invitation code. Can be used without authentication."""
    return await validate_invitation(code, email, check_used=False)


@router.post("/mark-used/{code}/")
async def mark_invitation_used_endpoint(
    code: str,
    current_user: User = Depends(get_current_user_dependency)
) -> Invitation:
    """Mark an invitation as used by the current user."""
    return await mark_invitation_used(code, current_user.id)


@router.delete("/{invitation_id}/")
async def delete_invitation_endpoint(
    invitation_id: UUID,
    current_user: User = Depends(get_current_user_dependency)
) -> None:
    """
    Delete an invitation.

    If the invitation belongs to an organization, the user must be an owner or admin of the organization.
    Otherwise, the user must be a global admin.
    """
    try:
        # First get the invitation to check permissions
        invitation = await get_invitation(invitation_id)

        if invitation.organization_id:
            # Check if user is a member of the organization with appropriate permissions
            member = await organization_services.get_organization_member(
                invitation.organization_id, current_user.id
            )
            if not member or member.role not in ["owner", "admin"]:
                raise HTTPException(
                    status_code=403,
                    detail="You do not have permission to delete invitations for this organization"
                )
        else:
            # For global invitations, require admin privileges
            await check_is_admin(current_user)

        await delete_invitation(invitation_id)
    except HTTPException as e:
        # Pass through HTTPExceptions (like 403 permissions errors)
        raise e
    except Exception as e:
        # For other errors, return a 404
        raise HTTPException(
            status_code=404,
            detail=f"Invitation not found: {str(e)}"
        )
