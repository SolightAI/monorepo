import pydantic

from datetime import datetime


class AdCampaign(pydantic.BaseModel):
    id: int
    name: str
    created_at: datetime

    budget: int
    start_date: datetime
    end_date: datetime
    status: str
