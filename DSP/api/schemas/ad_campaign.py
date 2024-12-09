from pydantic import BaseModel
from datetime import datetime


class AdCampaignCreate(BaseModel):
    name: str
    budget: int
    start_date: datetime
    end_date: datetime
    status: str
    product_url: str


class AdCampaign(BaseModel):
    id: int
    user_id: int
    name: str
    budget: int
    start_date: datetime
    end_date: datetime
    status: str
    created_at: datetime
    product_url: str

    class Config:
        from_attributes = True
