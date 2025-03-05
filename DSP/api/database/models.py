from enum import Enum
from tortoise import fields, models
from schemas.ad_campaign import (
    AdCampaign as _AdCampaignSchema,
)
from schemas.user import (
    User as _UserSchema,
    UserPrivate as _UserPrivateSchema,
)

class CampaignStatus(str, Enum):
    DRAFT = "Draft"
    ACTIVE = "Active"
    PAUSED = "Paused"
    FINISHED = "Finished"
    STOPPED = "Stopped"

class AdCampaign(models.Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=255)
    created_at = fields.DatetimeField(auto_now_add=True)

    user = fields.ForeignKeyField('models.User', related_name='campaigns')

    budget = fields.IntField()
    start_date = fields.DatetimeField()
    end_date = fields.DatetimeField()
    product_url = fields.TextField()

    status = fields.CharEnumField(
        CampaignStatus,
        max_length=255,
        default=CampaignStatus.DRAFT
    )

    # Add new fields for targeting and other details
    # targeting_age = fields.JSONField(null=True)
    # targeting_gender = fields.JSONField(null=True)
    # targeting_locations = fields.JSONField(null=True)
    # targeting_interests = fields.JSONField(null=True)
    # targeting_devices = fields.JSONField(null=True)

    # Add fields for budget configuration
    # daily_budget = fields.IntField(null=True)
    # bidding_strategy = fields.CharField(max_length=255, null=True)
    # max_bid = fields.FloatField(null=True)

    async def to_schema(self) -> _AdCampaignSchema:
        return _AdCampaignSchema(
            id=self.id,
            name=self.name,
            created_at=self.created_at,
            user_id=self.user_id,
            status=self.status,
            budget=self.budget,
            start_date=self.start_date,
            end_date=self.end_date,
            product_url=self.product_url,
        )

    class Meta:
        table = "adcampaign"


class User(models.Model):
    id = fields.IntField(pk=True)

    username = fields.CharField(max_length=255, unique=True)
    email = fields.CharField(max_length=255, unique=True)
    created_at = fields.DatetimeField(auto_now_add=True)

    campaigns = fields.ReverseRelation["AdCampaign"]

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
