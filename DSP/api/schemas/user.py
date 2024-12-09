import pydantic

from datetime import datetime


class UserPrivate(pydantic.BaseModel):
    id: int
    username: str


class User(UserPrivate):
    email: str
    created_at: datetime

    def to_user_private(self) -> UserPrivate:
        user_dict = self.model_dump(exclude={"email", "created_at"})
        return UserPrivate(**user_dict)


class TokenData(pydantic.BaseModel):
    username: str | None = None
