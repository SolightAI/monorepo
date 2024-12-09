from tortoise import fields, models
from schemas.ad_campaign import (
    AdCampaign as _AdCampaignSchema,
)
from schemas.user import (
    User as _UserSchema,
    UserPrivate as _UserPrivateSchema,
)

class AdCampaign(models.Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=255)
    created_at = fields.DatetimeField(auto_now_add=True)

    budget = fields.IntField()
    start_date = fields.DatetimeField()
    end_date = fields.DatetimeField()

    status = fields.CharField(max_length=255)

    async def to_schema(self) -> _AdCampaignSchema:
        return _AdCampaignSchema(
            id=self.id,
            name=self.name,
            created_at=self.created_at,
        )


class User(models.Model):
    id = fields.IntField(pk=True)

    username = fields.CharField(max_length=255, unique=True)
    email = fields.CharField(max_length=255, unique=True)
    created_at = fields.DatetimeField(auto_now_add=True)

    async def to_schema(self, user_id: int | None = None) -> _UserSchema:

        if user_id is None or user_id == self.id:
            schema = _UserSchema(
                id=self.id,
                username=self.username,
                email=self.email,
                created_at=self.created_at,
            )
        else:
            schema = _UserPrivateSchema(
                id=self.id,
                username=self.username,
            )

        return schema

    class Meta:
        table = "users"
