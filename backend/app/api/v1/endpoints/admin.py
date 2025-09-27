from fastapi import APIRouter, Depends
from app.core.security import verify_jwt
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
