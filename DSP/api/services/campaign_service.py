from database.models import AdCampaign as AdCampaignModel
from schemas.ad_campaign import AdCampaignCreate
from schemas.user import User
from datetime import datetime, timezone


async def get_campaign(id: int):
    # Get campaign with additional metrics and details
    return await AdCampaignModel.filter(id=id).first()
    # if campaign:
    #     # Convert to dict for adding additional fields
    #     campaign_dict = {
    #         "id": campaign.id,
    #         "name": campaign.name,
    #         "status": campaign.status,
    #         "budget": campaign.budget,
    #         "start_date": campaign.start_date,
    #         "end_date": campaign.end_date,
    #         "created_at": campaign.created_at,
    #         # Add mock metrics (in a real app, these would come from your analytics service)
    #         "metrics": {
    #             "impressions": "1.2M",
    #             "clicks": "45.2K",
    #             "ctr": "3.75%",
    #             "spend": "3,240",
    #             "conversions": "850",
    #             "conversion_rate": "2.8%",
    #             "cpc": "1.24",
    #             "roas": "3.2"
    #         }
    #     }
    #     return campaign_dict
    # return None


async def get_campaigns(user: User):
    return await AdCampaignModel.filter(user=user).all()


async def create_campaign(campaign: AdCampaignCreate, user: User):
    campaign_dict = campaign.model_dump()
    campaign_dict['created_at'] = datetime.now(timezone.utc)

    return await AdCampaignModel.create(**campaign_dict, user=user)
