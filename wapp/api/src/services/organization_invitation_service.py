from dto.schemas import OrganizationMemberCreate
from services.organization_services import add_member_to_organization, get_organization_member
from services.invitation_services import validate_invitation, mark_invitation_used
from fastapi import HTTPException, status
import logging
from typing import Tuple
from dto.schemas import OrganizationRole

async def handle_organization_invitation(invitation_code: str, user) -> Tuple[bool, str]:
    """
    Handle the organization invitation process for a user.
    
    Args:
        invitation_code (str): The invitation code to validate
        user: The user object containing id and email
        
    Returns:
        Tuple[bool, str]: A tuple containing:
            - bool: True if the invitation was processed successfully, False otherwise
            - str: A message describing the result or error
    """
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You must be logged in to join an organization"
        )

    try:
        # First validate the invitation without checking email and allowing used invitations
        invitation = await validate_invitation(invitation_code, check_used=False)
        
        # Then check if the email matches for individual invitations
        if invitation.email and invitation.email.lower() != user.email.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This invitation is for {invitation.email}. Please log in with that email address."
            )

        # For join-org invitations, handle organization membership
        if invitation.organization_id:
            # Check if user is already a member
            existing_member = await get_organization_member(
                invitation.organization_id, user.id
            )
            if existing_member:
                await mark_invitation_used(invitation.code, user.id)
                return True, "You are already a member of this organization"

            # Add user to the organization
            await add_member_to_organization(
                organization_id=invitation.organization_id,
                data=OrganizationMemberCreate(
                    user_id=user.id,
                    role=invitation.role or OrganizationRole.MEMBER,  # Default to MEMBER if no role specified
                    invited_by_id=invitation.created_by_id
                )
            )
            await mark_invitation_used(invitation.code, user.id)
            return True, "Successfully joined the organization"

        # For individual invitations, just mark it as used
        await mark_invitation_used(invitation.code, user.id)
        return True, "Successfully validated invitation"

    except HTTPException as e:
        # Re-raise HTTP exceptions with their original status and detail
        raise e
    except Exception as e:
        logging.error(f"Failed to process organization invitation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to process organization invitation"
        )