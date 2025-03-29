from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Dict
from dto.models import User
from dependencies import get_current_user_dependency


router = APIRouter(prefix="/users")


class OnboardingStatus(BaseModel):
    completed: bool


@router.post("/onboarding/completed", response_model=Dict)
async def update_onboarding_status(
    status: OnboardingStatus,
    current_user: User = Depends(get_current_user_dependency)
) -> Dict:
    """
    Update the onboarding completion status for the current user.
    """
    current_user.onboarding_completed = status.completed
    await current_user.save()

    return {
        "success": True,
        "message": "Onboarding status updated successfully",
        "user_id": current_user.id,
        "onboarding_completed": current_user.onboarding_completed
    }


@router.get("/preferences", response_model=Dict)
async def get_user_preferences(
    current_user: User = Depends(get_current_user_dependency)
) -> Dict:
    """
    Get user preferences including onboarding status.
    """
    return {
        "success": True,
        "onboarding_completed": current_user.onboarding_completed,
        "user_id": current_user.id
    }


@router.post("/preferences", response_model=Dict)
async def update_user_preferences(
    preferences: Dict,
    current_user: User = Depends(get_current_user_dependency)
) -> Dict:
    """
    Update user preferences. This can be extended in the future
    to store more user-specific preferences.
    """
    # Currently, we only handle onboarding status
    if "onboarding_completed" in preferences:
        current_user.onboarding_completed = preferences["onboarding_completed"]
        await current_user.save()

    return {
        "success": True,
        "message": "User preferences updated successfully",
        "user_id": current_user.id
    }
