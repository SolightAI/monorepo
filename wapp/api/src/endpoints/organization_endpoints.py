from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query

from dto.schemas import (
    Organization,
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationWithMembers,
    OrganizationMember,
    OrganizationMemberCreate,
    OrganizationMemberUpdate,
    OrganizationRole,
    PublicOrganization,
    User,
)
from services import organization_services
from services.invitation_services import validate_invitation, mark_invitation_used
from dependencies import get_current_user_dependency

router = APIRouter(
    prefix="/organizations",
    tags=["organizations"],
    responses={404: {"description": "Not found"}},
)


@router.post("/", response_model=Organization, status_code=status.HTTP_201_CREATED)
async def create_organization(
    data: OrganizationCreate, current_user: User = Depends(get_current_user_dependency)
) -> Organization:
    """
    Create a new organization.

    The current user will automatically be added as an owner.
    """
    return await organization_services.create_organization(data, current_user.id)


@router.get("/", response_model=List[Organization])
async def get_user_organizations(current_user: User = Depends(get_current_user_dependency)) -> List[Organization]:
    """
    Get all organizations the current user belongs to.
    """
    return await organization_services.get_organizations_for_user(current_user.id)


@router.get("/{organization_id}", response_model=Organization)
async def get_organization(
    organization_id: UUID, current_user: User = Depends(get_current_user_dependency)
) -> Organization:
    """
    Get an organization by ID.

    The user must be a member of the organization.
    """
    # Check if user is a member of the organization
    member = await organization_services.get_organization_member(
        organization_id, current_user.id
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this organization",
        )

    organization = await organization_services.get_organization(organization_id)
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    return organization


@router.get("/{organization_id}/members", response_model=OrganizationWithMembers)
async def get_organization_with_members(
    organization_id: UUID, current_user: User = Depends(get_current_user_dependency)
) -> OrganizationWithMembers:
    """
    Get an organization with its members.

    The user must be a member of the organization.
    """
    # Check if user is a member of the organization
    member = await organization_services.get_organization_member(
        organization_id, current_user.id
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this organization",
        )

    organization = await organization_services.get_organization_with_members(organization_id)
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    return organization


@router.put("/{organization_id}", response_model=Organization)
async def update_organization(
    organization_id: UUID,
    data: OrganizationUpdate,
    current_user: User = Depends(get_current_user_dependency),
) -> Organization:
    """
    Update an organization.

    The user must be an owner or admin of the organization.
    """
    # Check if user is an owner or admin of the organization
    member = await organization_services.get_organization_member(
        organization_id, current_user.id
    )
    if not member or member.role not in [OrganizationRole.OWNER, OrganizationRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this organization",
        )

    organization = await organization_services.update_organization(organization_id, data)
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    return organization


@router.delete("/{organization_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(
    organization_id: UUID, current_user: User = Depends(get_current_user_dependency)
) -> None:
    """
    Delete an organization.

    The user must be an owner of the organization.
    """
    # Check if user is an owner of the organization
    member = await organization_services.get_organization_member(
        organization_id, current_user.id
    )
    if not member or member.role != OrganizationRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this organization",
        )

    success = await organization_services.delete_organization(organization_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )


@router.post("/{organization_id}/members", response_model=OrganizationMember)
async def add_member(
    organization_id: UUID,
    data: OrganizationMemberCreate,
    current_user: User = Depends(get_current_user_dependency),
) -> OrganizationMember:
    """
    Add a member to an organization.

    The user must be an owner or admin of the organization.
    """
    # Check if user is an owner or admin of the organization
    member = await organization_services.get_organization_member(
        organization_id, current_user.id
    )
    if not member or member.role not in [OrganizationRole.OWNER, OrganizationRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to add members to this organization",
        )

    # Set the invited_by_id if not provided
    if not data.invited_by_id:
        data.invited_by_id = current_user.id

    new_member = await organization_services.add_member_to_organization(
        organization_id, data
    )
    if not new_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to add member to organization",
        )

    return new_member


@router.put("/{organization_id}/members/{user_id}", response_model=OrganizationMember)
async def update_member_role(
    organization_id: UUID,
    user_id: int,
    data: OrganizationMemberUpdate,
    current_user: User = Depends(get_current_user_dependency),
) -> OrganizationMember:
    """
    Update a member's role in an organization.

    - The requesting user must be an owner or admin of the organization.
    - An admin cannot change an owner's role.
    - A user cannot assign a role higher than their own.
    """
    # Define role hierarchy (higher number is higher privilege)
    role_hierarchy = {
        OrganizationRole.OWNER: 4,
        OrganizationRole.ADMIN: 3,
        OrganizationRole.MEMBER: 2,
        OrganizationRole.GUEST: 1,
    }

    # Check if the requesting user exists and is a member
    requesting_member = await organization_services.get_organization_member(
        organization_id, current_user.id
    )
    if not requesting_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization",
        )

    # Check if the requesting user has permission to update roles (Admin or Owner)
    if requesting_member.role not in [OrganizationRole.OWNER, OrganizationRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update member roles in this organization",
        )

    # Check if the target user exists
    target_member = await organization_services.get_organization_member(
        organization_id, user_id
    )
    if not target_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Target member not found"
        )

    # Prevent an admin from changing an owner's role
    if requesting_member.role == OrganizationRole.ADMIN and target_member.role == OrganizationRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins cannot change the role of an owner",
        )

    # Check if the new role is valid and not higher than the requesting user's role
    new_role = data.role
    if new_role:
        requesting_user_level = role_hierarchy.get(requesting_member.role, 0)
        new_role_level = role_hierarchy.get(new_role, 0)

        if new_role_level > requesting_user_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot assign a role higher than your own",
            )

    # Prevent changing the role of the last owner if the new role is not owner
    if target_member.role == OrganizationRole.OWNER and new_role != OrganizationRole.OWNER:
        owner_count = await organization_services.get_organization_owner_count(organization_id)
        if owner_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the role of the last owner",
            )

    updated_member = await organization_services.update_member_role(
        organization_id, user_id, data
    )
    if not updated_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    return updated_member


@router.delete("/{organization_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    organization_id: UUID,
    user_id: int,
    current_user: User = Depends(get_current_user_dependency),
) -> None:
    """
    Remove a member from an organization.

    - The user must be an owner or admin of the organization,
      or the user can remove themselves.
    - A user cannot remove another user with a higher role.
    """
    # Define role hierarchy (higher number is higher privilege)
    role_hierarchy = {
        OrganizationRole.OWNER: 4,
        OrganizationRole.ADMIN: 3,
        OrganizationRole.MEMBER: 2,
        OrganizationRole.GUEST: 1,
    }

    # Check if requesting user is a member of the organization
    requesting_member = await organization_services.get_organization_member(
        organization_id, current_user.id
    )
    if not requesting_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this organization",
        )

    # Allow users to remove themselves
    if user_id == current_user.id:
        # Check if they are the last owner before removing themselves
        if requesting_member.role == OrganizationRole.OWNER:
            owner_count = await organization_services.get_organization_owner_count(organization_id)
            if owner_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot remove the last owner of the organization.",
                )
    else:
        # For removing others, must be owner or admin
        if requesting_member.role not in [OrganizationRole.OWNER, OrganizationRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to remove members from this organization",
            )

        # Check if the target user exists
        target_member = await organization_services.get_organization_member(
            organization_id, user_id
        )
        if not target_member:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target member not found")

        # Check if the requesting user's role is high enough to remove the target user
        requesting_user_level = role_hierarchy.get(requesting_member.role, 0)
        target_user_level = role_hierarchy.get(target_member.role, 0)

        if target_user_level > requesting_user_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot remove a member with a role higher than your own",
            )

    # Proceed with removal (service layer handles removing last owner check again for safety)
    success = await organization_services.remove_member_from_organization(
        organization_id, user_id
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to remove member from organization",
        )


@router.get("/{organization_id}/members", response_model=List[OrganizationMember])
async def get_members(
    organization_id: UUID, current_user: User = Depends(get_current_user_dependency)
) -> List[OrganizationMember]:
    """
    Get all members of an organization.

    The user must be a member of the organization.
    """
    # Check if user is a member of the organization
    member = await organization_services.get_organization_member(
        organization_id, current_user.id
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this organization",
        )

    return await organization_services.get_organization_members(organization_id)


@router.get("/{organization_id}/members/{user_id}", response_model=OrganizationMember)
async def get_member(
    organization_id: UUID,
    user_id: int,
    current_user: User = Depends(get_current_user_dependency),
) -> OrganizationMember:
    """
    Get a specific member of an organization.

    The user must be a member of the organization.
    """
    # Check if user is a member of the organization
    member = await organization_services.get_organization_member(
        organization_id, current_user.id
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this organization",
        )

    target_member = await organization_services.get_organization_member(
        organization_id, user_id
    )
    if not target_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    return target_member


@router.get("/public/{organization_id}", response_model=PublicOrganization)
async def get_organization_public(organization_id: UUID) -> PublicOrganization:
    """
    Get an organization by ID for invitation validation.
    This endpoint can be accessed without authentication.
    Only returns public information about the organization.
    """
    organization = await organization_services.get_organization(organization_id)
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    return PublicOrganization.model_validate(organization)


@router.post("/{organization_id}/join")
async def join_organization(
    organization_id: UUID,
    invitation_code: str = Query(..., description="The invitation code to join the organization"),
    current_user: User = Depends(get_current_user_dependency),
) -> OrganizationMember:
    """
    Join an organization through an invitation.
    This endpoint can be used by users who have received an invitation.
    """
    # Validate the invitation and check if it's used since we're actually joining now
    invitation = await validate_invitation(invitation_code, current_user.email, check_used=True)

    # Check if the invitation is for this organization
    if invitation.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation is not valid for this organization",
        )

    # Check if user is already a member
    existing_member = await organization_services.get_organization_member(
        organization_id, current_user.id
    )
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this organization",
        )

    # Add the user as a member with the role from the invitation
    member_data = OrganizationMemberCreate(
        user_id=current_user.id,
        role=invitation.role or OrganizationRole.MEMBER,  # Use invitation role or default to MEMBER
        invited_by_id=invitation.created_by_id,
    )

    new_member = await organization_services.add_member_to_organization(
        organization_id, member_data
    )
    if not new_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to join organization",
        )

    # Mark the invitation as used
    await mark_invitation_used(invitation_code, current_user.id)

    return new_member
