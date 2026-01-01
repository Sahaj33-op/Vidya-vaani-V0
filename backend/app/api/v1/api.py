from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    chat,
    documents,
    handoffs,
    health,
    rag,
    translation,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(handoffs.router, prefix="/handoffs", tags=["handoffs"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(rag.router, prefix="/rag", tags=["rag"])
api_router.include_router(translation.router, prefix="/translate", tags=["translation"])
