from services import campaign_service
from dependencies import get_current_user
from schemas.user import User
from schemas.ad_campaign import AdCampaign, AdCampaignCreate
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from services.event_logging_service import log_event, CampaignEvent
from services.event_logging_service import clickhouse_client


router = APIRouter()


@router.get("/")
async def get_campaigns(current_user: User = Depends(get_current_user)):
    return await campaign_service.get_campaigns(current_user)


@router.post("/", response_model=AdCampaign)
async def create_campaign(
    campaign: AdCampaignCreate,
    current_user: User = Depends(get_current_user)
):
    return await (await campaign_service.create_campaign(campaign, current_user)).to_schema()


@router.get("/{campaign_id}")
async def get_campaign(
    campaign_id: int,
    current_user: User = Depends(get_current_user)
):
    campaign = await campaign_service.get_campaign(campaign_id)

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Ensure the campaign belongs to the current user
    if campaign.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this campaign")

    return campaign


@router.post("/track-impression")
async def track_impression(
    campaign_id: int,
    background_tasks: BackgroundTasks,
    user_id: str = None,
    publisher_id: str = None,
    ip_address: str = None,
    user_agent: str = None,
    geo_country: str = None,
):
    event = CampaignEvent(
        campaign_id=campaign_id,
        event_type='impression',
        user_id=user_id,
        publisher_id=publisher_id,
        ip_address=ip_address,
        user_agent=user_agent,
        geo_country=geo_country,
        cost_usd=0.001  # Example cost per impression TODO: get from bid
    )

    await log_event(event, background_tasks)
    return {"status": "success"}


@router.get("/{campaign_id}/stats")
async def get_campaign_stats(campaign_id: int):
    """Get campaign statistics from ClickHouse"""

    print(f"{campaign_id=}")
    print(f"{type(campaign_id)=}")
    stats = clickhouse_client.execute(
        '''
        SELECT
            date,
            impressions,
            clicks,
            conversions,
            total_cost
        FROM campaign_stats_mv
        WHERE campaign_id = %(campaign_id)s
        ORDER BY date DESC
        LIMIT 30
        ''',
        {'campaign_id': campaign_id}
    )

    return {
        "daily_stats": [
            {
                "date": date,
                "impressions": impressions,
                "clicks": clicks,
                "conversions": conversions,
                "total_cost": total_cost
            }
            for date, impressions, clicks, conversions, total_cost in stats
        ]
    }
