from typing import List, Optional
from uuid import UUID, uuid4

from tortoise.exceptions import DoesNotExist, IntegrityError
from dto.models import Organization, OrganizationMember, User
from dto.schemas import (
    OrganizationCreate,
    OrganizationUpdate,
    Organization as OrganizationSchema,
    OrganizationWithMembers,
    OrganizationMemberCreate,
    OrganizationMemberUpdate,
    OrganizationMember as OrganizationMemberSchema,
    OrganizationRole,
)


async def get_organization(organization_id: UUID) -> Optional[OrganizationSchema]:
    """
    Get an organization by ID.

    Args:
        organization_id: The UUID of the organization to retrieve

    Returns:
        The organization if found, None otherwise
    """
    try:
        organization = await Organization.get(id=organization_id)
        return OrganizationSchema.model_validate(organization)
    except DoesNotExist:
        return None


async def get_organization_with_members(organization_id: UUID) -> Optional[OrganizationWithMembers]:
    """
    Get an organization with its members by ID.

    Args:
        organization_id: The UUID of the organization to retrieve

    Returns:
        The organization with members if found, None otherwise
    """
    try:
        organization = await Organization.get(id=organization_id).prefetch_related("members__user")
        org_dict = organization.__dict__

        # Process members with proper user conversion
        members_list = []
        for member in organization.members:
            # Create a copy of the member as a dictionary
            member_dict = {
                "id": member.id,
                "user_id": member.user_id,
                "organization_id": member.organization_id,
                "role": member.role,
                "joined_at": member.joined_at,
                "invited_by_id": member.invited_by_id if hasattr(member, "invited_by_id") else None
            }

            # Convert the User object to UserPrivate
            if member.user:
                member_dict["user"] = {
                    "id": member.user.id,
                    "username": member.user.username
                }

            members_list.append(OrganizationMemberSchema.model_validate(member_dict))

        org_dict["members"] = members_list
        return OrganizationWithMembers.model_validate(org_dict)
    except DoesNotExist:
        return None


async def get_organizations_for_user(user_id: int) -> List[OrganizationSchema]:
    """
    Get all organizations a user belongs to.

    Args:
        user_id: The ID of the user

    Returns:
        List of organizations the user belongs to
    """
    memberships = await OrganizationMember.filter(user_id=user_id).prefetch_related("organization")
    return [OrganizationSchema.model_validate(m.organization) for m in memberships]


async def create_organization(
    data: OrganizationCreate, creator_id: int
) -> OrganizationSchema:
    """
    Create a new organization and add the creator as an owner.

    Args:
        data: The organization data
        creator_id: The ID of the user creating the organization

    Returns:
        The created organization
    """
    # Create the organization
    organization = await Organization.create(
        id=uuid4(),
        name=data.name,
        description=data.description,
        logo_url=data.logo_url,
        type=data.type,
    )

    # Add the creator as an owner
    await OrganizationMember.create(
        id=uuid4(),
        user_id=creator_id,
        organization=organization,
        role=OrganizationRole.OWNER,
    )

    return OrganizationSchema.model_validate(organization)


async def update_organization(
    organization_id: UUID, data: OrganizationUpdate
) -> Optional[OrganizationSchema]:
    """
    Update an organization.

    Args:
        organization_id: The UUID of the organization to update
        data: The updated organization data

    Returns:
        The updated organization if found, None otherwise
    """
    try:
        organization = await Organization.get(id=organization_id)

        # Update only the fields that are provided
        update_data = data.model_dump(exclude_unset=True, exclude_none=True)
        for key, value in update_data.items():
            setattr(organization, key, value)

        await organization.save()
        return OrganizationSchema.model_validate(organization)
    except DoesNotExist:
        return None


async def delete_organization(organization_id: UUID) -> bool:
    """
    Delete an organization.

    Args:
        organization_id: The UUID of the organization to delete

    Returns:
        True if the organization was deleted, False otherwise
    """
    try:
        organization = await Organization.get(id=organization_id)
        await organization.delete()
        return True
    except DoesNotExist:
        return False


async def add_member_to_organization(
    organization_id: UUID, data: OrganizationMemberCreate
) -> Optional[OrganizationMemberSchema]:
    """
    Add a member to an organization.

    Args:
        organization_id: The UUID of the organization
        data: The member data

    Returns:
        The created organization member if successful, None otherwise
    """
    try:
        # Check if organization exists
        organization = await Organization.get(id=organization_id)

        # Check if user exists
        user = await User.get(id=data.user_id)

        # Check if user is already a member
        existing_member = await OrganizationMember.filter(
            user_id=data.user_id, organization_id=organization_id
        ).first()

        if existing_member:
            return None

        # Add the member
        member = await OrganizationMember.create(
            id=uuid4(),
            user=user,
            organization=organization,
            role=data.role,
            invited_by_id=data.invited_by_id,
        )

        # Create a dictionary with the proper structure for validation
        member_dict = {
            "id": member.id,
            "user_id": member.user_id,
            "organization_id": member.organization_id,
            "role": member.role,
            "joined_at": member.joined_at,
            "invited_by_id": member.invited_by_id if hasattr(member, "invited_by_id") else None
        }

        # Add user data in the correct format
        if hasattr(member, "user") and member.user:
            member_dict["user"] = {
                "id": user.id,
                "username": user.username
            }

        return OrganizationMemberSchema.model_validate(member_dict)
    except (DoesNotExist, IntegrityError):
        return None


async def update_member_role(
    organization_id: UUID, user_id: int, data: OrganizationMemberUpdate
) -> Optional[OrganizationMemberSchema]:
    """
    Update a member's role in an organization.

    Args:
        organization_id: The UUID of the organization
        user_id: The ID of the user
        data: The updated member data

    Returns:
        The updated organization member if successful, None otherwise
    """
    try:
        member = await OrganizationMember.get(
            user_id=user_id, organization_id=organization_id
        )

        # Update the role
        member.role = data.role
        await member.save()

        # Fetch the updated member with user data
        updated_member = await OrganizationMember.get(
            user_id=user_id, organization_id=organization_id
        ).prefetch_related("user")

        # Create a dictionary with the proper structure for validation
        member_dict = {
            "id": updated_member.id,
            "user_id": updated_member.user_id,
            "organization_id": updated_member.organization_id,
            "role": updated_member.role,
            "joined_at": updated_member.joined_at,
            "invited_by_id": updated_member.invited_by_id if hasattr(updated_member, "invited_by_id") else None
        }

        # Add user data in the correct format
        if hasattr(updated_member, "user") and updated_member.user:
            member_dict["user"] = {
                "id": updated_member.user.id,
                "username": updated_member.user.username
            }

        return OrganizationMemberSchema.model_validate(member_dict)
    except DoesNotExist:
        return None


async def remove_member_from_organization(
    organization_id: UUID, user_id: int
) -> bool:
    """
    Remove a member from an organization.

    Args:
        organization_id: The UUID of the organization
        user_id: The ID of the user to remove

    Returns:
        True if the member was removed, False otherwise
    """
    try:
        member = await OrganizationMember.get(
            user_id=user_id, organization_id=organization_id
        )

        # Check if this is the last owner
        if member.role == OrganizationRole.OWNER:
            owner_count = await OrganizationMember.filter(
                organization_id=organization_id, role=OrganizationRole.OWNER
            ).count()

            if owner_count <= 1:
                # Cannot remove the last owner
                return False

        await member.delete()
        return True
    except DoesNotExist:
        return False


async def get_organization_members(
    organization_id: UUID
) -> List[OrganizationMemberSchema]:
    """
    Get all members of an organization.

    Args:
        organization_id: The UUID of the organization

    Returns:
        List of organization members
    """
    members = await OrganizationMember.filter(
        organization_id=organization_id
    ).prefetch_related("user")

    result = []
    for member in members:
        # Create a copy of the member as a dictionary
        member_dict = {
            "id": member.id,
            "user_id": member.user_id,
            "organization_id": member.organization_id,
            "role": member.role,
            "joined_at": member.joined_at,
            "invited_by_id": member.invited_by_id if hasattr(member, "invited_by_id") else None
        }

        # Convert the User object to UserPrivate
        if member.user:
            member_dict["user"] = {
                "id": member.user.id,
                "username": member.user.username
            }

        result.append(OrganizationMemberSchema.model_validate(member_dict))

    return result


async def get_organization_member(
    organization_id: UUID, user_id: int
) -> Optional[OrganizationMemberSchema]:
    """
    Get a specific member of an organization.

    Args:
        organization_id: The UUID of the organization
        user_id: The ID of the user

    Returns:
        The organization member if found, None otherwise
    """
    try:
        member = await OrganizationMember.get(
            user_id=user_id, organization_id=organization_id
        ).prefetch_related("user")

        # Create a copy of the member as a dictionary
        member_dict = {
            "id": member.id,
            "user_id": member.user_id,
            "organization_id": member.organization_id,
            "role": member.role,
            "joined_at": member.joined_at,
            "invited_by_id": member.invited_by_id if hasattr(member, "invited_by_id") else None
        }

        # Convert the User object to UserPrivate
        if member.user:
            member_dict["user"] = {
                "id": member.user.id,
                "username": member.user.username
            }

        return OrganizationMemberSchema.model_validate(member_dict)
    except DoesNotExist:
        return None
