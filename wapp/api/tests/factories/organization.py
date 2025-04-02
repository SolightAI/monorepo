import factory
from faker import Faker
from typing import Any, Dict

fake = Faker()


class OrganizationFactory(factory.Factory):
    """Factory for creating test organization data."""

    class Meta:
        """Meta class for OrganizationFactory."""
        model = Dict[str, Any]

    name = factory.LazyFunction(lambda: fake.company())
    description = factory.LazyFunction(lambda: fake.catch_phrase())
    type = "enterprise"  # Default type

    @classmethod
    def with_members(cls, member_count: int = 3, **kwargs) -> Dict[str, Any]:
        """Create an organization with members."""
        from .user import UserFactory

        org = cls(**kwargs)
        org["members"] = [UserFactory.regular() for _ in range(member_count)]
        return org

    @classmethod
    def small(cls, **kwargs) -> Dict[str, Any]:
        """Create a small organization."""
        kwargs["type"] = "small"
        return cls(**kwargs)

    @classmethod
    def enterprise(cls, **kwargs) -> Dict[str, Any]:
        """Create an enterprise organization."""
        kwargs["type"] = "enterprise"
        return cls(**kwargs)
