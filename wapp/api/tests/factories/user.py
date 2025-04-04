import factory
from faker import Faker
from typing import Any
from dto.models import User

fake = Faker()


class UserFactory(factory.Factory):
    """Factory for creating test user data."""

    class Meta:
        """Meta class for UserFactory."""
        model = User

    username = factory.LazyFunction(lambda: fake.user_name())
    email = factory.LazyFunction(lambda: fake.email())
    is_admin = factory.LazyFunction(lambda: False)
    onboarding_completed = factory.LazyFunction(lambda: False)

    @classmethod
    def admin(cls, **kwargs) -> User:
        """Create an admin user."""
        return cls(is_admin=True, **kwargs)

    @classmethod
    def regular(cls, **kwargs) -> User:
        """Create a regular user."""
        return cls(is_admin=False, **kwargs)

    @classmethod
    def onboarded(cls, **kwargs) -> User:
        """Create an onboarded user."""
        return cls(onboarding_completed=True, **kwargs)
