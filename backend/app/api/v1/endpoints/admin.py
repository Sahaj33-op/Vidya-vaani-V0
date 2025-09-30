from fastapi import APIRouter, Depends
from app.core.security import verify_jwt, get_current_admin_user
from app.dependencies import get_auth_service

router = APIRouter()

@router.get("/stats", dependencies=[Depends(verify_jwt)])
async def get_stats():
    # Placeholder for system statistics
    return {
        "status": "operational",
        "users_online": 10,
        "documents_indexed": 1500,
        "api_calls_last_hour": 250,
    }

@router.get("/health")
async def health_check():
    return {"status": "ok"}

@router.post("/verify-token", dependencies=[Depends(get_current_admin_user)])
async def verify_admin_token(user_data: dict = Depends(verify_jwt)):
    """
    Verifies the JWT token and returns user data if the user is an admin.
    This endpoint is intended to be called by the frontend to authenticate admin actions.
    """
    return user_data
