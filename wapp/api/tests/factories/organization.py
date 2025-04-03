import factory
from faker import Faker
from uuid import uuid4
from datetime import datetime
from dto.models import Organization, OrganizationMember
from dto.schemas import OrganizationType, OrganizationRole

fake = Faker()


class OrganizationFactory(factory.Factory):
    """Factory for creating test organization data."""

    class Meta:
        """Meta class for OrganizationFactory."""
        model = Organization

    id = factory.LazyFunction(lambda: uuid4())
    name = factory.LazyFunction(lambda: fake.company())
    type = factory.LazyFunction(lambda: OrganizationType.ENTERPRISE)
    logo_url = factory.LazyFunction(lambda: fake.image_url())
    created_at = factory.LazyFunction(lambda: datetime.now())
    updated_at = factory.LazyFunction(lambda: datetime.now())
    settings = factory.LazyFunction(lambda: {})

    @classmethod
    async def with_members(cls, member_count: int = 3, **kwargs) -> Organization:
        """Create an organization with members."""
        from .user import UserFactory

        org = cls(**kwargs)
        for _ in range(member_count):
            user = UserFactory.regular()
            await OrganizationMember.create(
                id=uuid4(),
                user=user,
                organization=org,
                role=OrganizationRole.MEMBER,
                joined_at=datetime.now()
            )
        return org

    @classmethod
    def startup(cls, **kwargs) -> Organization:
        """Create a startup organization."""
        return cls(type=OrganizationType.STARTUP, **kwargs)

    @classmethod
    def enterprise(cls, **kwargs) -> Organization:
        """Create an enterprise organization."""
        return cls(type=OrganizationType.ENTERPRISE, **kwargs)

    @classmethod
    def individual(cls, **kwargs) -> Organization:
        """Create an individual organization."""
        return cls(type=OrganizationType.INDIVIDUAL, **kwargs)

    @classmethod
    def education(cls, **kwargs) -> Organization:
        """Create an education organization."""
        return cls(type=OrganizationType.EDUCATION, **kwargs)
