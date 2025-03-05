from services import user_service
from dependencies import get_current_user
from schemas.user import User
from fastapi import APIRouter, Depends


router = APIRouter()


@router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return await user_service.read_users_me(user=current_user)
