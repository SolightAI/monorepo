from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from dto.schemas import (
    Organization,
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationWithMembers,
    OrganizationMember,
    OrganizationMemberCreate,
    OrganizationMemberUpdate,
    OrganizationRole,
)
from services import organization_services
from dependencies import get_current_user

router = APIRouter(
    prefix="/organizations",
    tags=["organizations"],
    responses={404: {"description": "Not found"}},
)


@router.post("/", response_model=Organization, status_code=status.HTTP_201_CREATED)
async def create_organization(
    data: OrganizationCreate, current_user=Depends(get_current_user)
):
    """
    Create a new organization.

    The current user will automatically be added as an owner.
    """
    return await organization_services.create_organization(data, current_user.id)


@router.get("/", response_model=List[Organization])
async def get_user_organizations(current_user=Depends(get_current_user)):
    """
    Get all organizations the current user belongs to.
    """
    return await organization_services.get_organizations_for_user(current_user.id)


@router.get("/{organization_id}", response_model=Organization)
async def get_organization(
    organization_id: UUID, current_user=Depends(get_current_user)
):
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
    organization_id: UUID, current_user=Depends(get_current_user)
):
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
    current_user=Depends(get_current_user),
):
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
    organization_id: UUID, current_user=Depends(get_current_user)
):
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
    current_user=Depends(get_current_user),
):
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
    current_user=Depends(get_current_user),
):
    """
    Update a member's role in an organization.

    The user must be an owner of the organization.
    """
    # Check if user is an owner of the organization
    member = await organization_services.get_organization_member(
        organization_id, current_user.id
    )
    if not member or member.role != OrganizationRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update member roles in this organization",
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
    current_user=Depends(get_current_user),
):
    """
    Remove a member from an organization.

    The user must be an owner or admin of the organization,
    or the user can remove themselves.
    """
    # Check if user is an owner or admin of the organization, or is removing themselves
    member = await organization_services.get_organization_member(
        organization_id, current_user.id
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this organization",
        )

    # Allow users to remove themselves
    if user_id != current_user.id:
        # For removing others, must be owner or admin
        if member.role not in [OrganizationRole.OWNER, OrganizationRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to remove members from this organization",
            )

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
    organization_id: UUID, current_user=Depends(get_current_user)
):
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
    current_user=Depends(get_current_user),
):
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
