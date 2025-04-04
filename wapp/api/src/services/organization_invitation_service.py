from dto.schemas import OrganizationMemberCreate
from services.organization_services import add_member_to_organization, get_organization_member
from services.invitation_services import validate_invitation, mark_invitation_used
from fastapi import HTTPException, status
import logging
from typing import Tuple

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
        # First validate the invitation with email check and used check
        invitation = await validate_invitation(invitation_code, user.email, check_used=True)
        
        if invitation.organization_id and invitation.role:
            # Check if user is already a member
            existing_member = await get_organization_member(
                invitation.organization_id, user.id
            )
            if existing_member:
                return True, "You are already a member of this organization"

            await add_member_to_organization(
                organization_id=invitation.organization_id,
                data=OrganizationMemberCreate(
                    user_id=user.id,
                    role=invitation.role,
                    invited_by_id=invitation.created_by_id
                )
            )
            await mark_invitation_used(invitation.code, user.id)
            return True, "Successfully joined the organization"

        return False, "Invalid invitation: no organization or role specified"

    except HTTPException as e:
        # Re-raise HTTP exceptions with their original status and detail
        raise e
    except Exception as e:
        logging.error(f"Failed to process organization invitation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to process organization invitation"
        ) 