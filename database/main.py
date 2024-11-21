from fastapi import APIRouter
from database.models import Ad

router = APIRouter()

@router.get("/")
async def get_ads():
    return [{"headline": a.headline, "description": a.description, "url": a.url} for a in Ad.select()]
