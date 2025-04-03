import factory
from faker import Faker
from typing import Any

fake = Faker()


class UserFactory(factory.Factory):
    """Factory for creating test user data."""

    class Meta:
        """Meta class for UserFactory."""
        model = dict

    email = factory.LazyFunction(lambda: fake.email())
    password = factory.LazyFunction(lambda: fake.password(length=12, special_chars=True, digits=True, upper_case=True, lower_case=True))
    full_name = factory.LazyFunction(lambda: fake.name())

    @classmethod
    def admin(cls, **kwargs) -> dict[str, Any]:
        """Create an admin user."""
        user = cls(**kwargs)
        user["is_admin"] = True
        return user

    @classmethod
    def regular(cls, **kwargs) -> dict[str, Any]:
        """Create a regular user."""
        user = cls(**kwargs)
        user["is_admin"] = False
        return user
