import logging
from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory storage for handoff requests (for hackathon demo)
# In production, this would be in a database
handoff_requests = []


class HandoffRequest(BaseModel):
    userId: str
    query: str
    context: str = ""
    language: str = "en"


class HandoffResponse(BaseModel):
    id: str
    userId: str
    timestamp: str
    status: str
    assignedTo: str = ""
    conversation: List[dict]
    priority: str


@router.post("/create")
async def create_handoff(request: HandoffRequest):
    """
    Create a new handoff request when the AI cannot answer
    """
    try:
        handoff_id = (
            f"handoff_{len(handoff_requests)}_{int(datetime.now().timestamp())}"
        )

        handoff = {
            "id": handoff_id,
            "userId": request.userId,
            "timestamp": datetime.now().isoformat(),
            "status": "pending",
            "assignedTo": "",
            "conversation": [
                {
                    "sender": "user",
                    "message": request.query,
                    "timestamp": datetime.now().isoformat(),
                }
            ],
            "priority": "medium",
            "language": request.language,
            "context": request.context,
        }

        handoff_requests.append(handoff)

        logger.info(f"Created handoff request: {handoff_id}")

        return {
            "success": True,
            "handoff_id": handoff_id,
            "message": "Your query has been forwarded to a human administrator. They will respond shortly.",
        }
    except Exception as e:
        logger.error(f"Failed to create handoff: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to create handoff: {str(e)}"
        )


@router.get("/list")
async def list_handoffs():
    """
    List all handoff requests (for admin panel)
    """
    try:
        return {
            "success": True,
            "handoffs": handoff_requests,
            "total": len(handoff_requests),
        }
    except Exception as e:
        logger.error(f"Failed to list handoffs: {e}", exc_info=True)
        return {
            "success": False,
            "handoffs": [],
            "total": 0,
        }


@router.get("/{handoff_id}")
async def get_handoff(handoff_id: str):
    """
    Get a specific handoff request
    """
    try:
        handoff = next((h for h in handoff_requests if h["id"] == handoff_id), None)

        if not handoff:
            raise HTTPException(status_code=404, detail="Handoff request not found")

        return handoff
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get handoff: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get handoff: {str(e)}")


@router.post("/{handoff_id}/resolve")
async def resolve_handoff(handoff_id: str, response: dict):
    """
    Resolve a handoff request with admin response
    """
    try:
        handoff = next((h for h in handoff_requests if h["id"] == handoff_id), None)

        if not handoff:
            raise HTTPException(status_code=404, detail="Handoff request not found")

        handoff["status"] = "resolved"
        handoff["conversation"].append(
            {
                "sender": "admin",
                "message": response.get("message", ""),
                "timestamp": datetime.now().isoformat(),
            }
        )

        logger.info(f"Resolved handoff request: {handoff_id}")

        return {
            "success": True,
            "message": "Handoff request resolved",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resolve handoff: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to resolve handoff: {str(e)}"
        )
