from fastapi import APIRouter, Depends

from app.core.security import get_current_admin_user, verify_jwt
from app.dependencies import get_auth_service, get_rag_service
from app.services.rag_service import RAGService

router = APIRouter()


@router.get("/stats")
async def get_stats(rag_service: RAGService = Depends(get_rag_service)):
    """Get real-time system statistics from RAG service"""
    try:
        stats = rag_service.get_stats()

        return {
            "totalDocuments": stats.get("total_documents", 0),
            "totalChunks": stats.get("total_chunks", 0),
            "totalQueries": 0,  # Could be tracked in a separate service
            "avgResponseTime": 0,  # Could be tracked via middleware
            "activeUsers": 0,  # Could be tracked via session management
            "handoffRequests": 0,  # Could be tracked in handoff service
        }
    except Exception as e:
        # Fallback to basic response if RAG service fails
        return {
            "totalDocuments": 0,
            "totalChunks": 0,
            "totalQueries": 0,
            "avgResponseTime": 0,
            "activeUsers": 0,
            "handoffRequests": 0,
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
