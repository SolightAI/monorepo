from fastapi import APIRouter
from database.models import Ad
from database._generate_fake_ads import main as _generate_fake_ads

router = APIRouter()

@router.get("/")
async def get_ads():
    return [{"headline": a.headline, "description": a.description, "url": a.url} for a in Ad.select()]

@router.post("/fake")
async def generate_fake_ads():
    return await _generate_fake_ads()
