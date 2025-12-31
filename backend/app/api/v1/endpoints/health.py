import logging
from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", tags=["health"])
async def health_check() -> Dict[str, Any]:
    """
    Basic health check endpoint
    Returns 200 OK if service is running
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
    }


@router.get("/health/ready", tags=["health"])
async def readiness_check() -> JSONResponse:
    """
    Readiness probe - checks if service is ready to handle requests
    Returns 200 if ready, 503 if not ready
    """
    checks = {"config": "ok", "services": "ok"}

    is_ready = True

    if not settings.DEMO_MODE:
        if not settings.GEMINI_API_KEY:
            checks["gemini"] = "not_configured"
            is_ready = False
        else:
            checks["gemini"] = "ok"

        if settings.REDIS_ENABLED:
            try:
                import redis

                r = redis.Redis(
                    host=settings.REDIS_HOST,
                    port=settings.REDIS_PORT,
                    password=settings.REDIS_PASSWORD,
                    db=settings.REDIS_DB,
                    socket_connect_timeout=2,
                    ssl=settings.REDIS_TLS,
                )
                r.ping()
                checks["redis"] = "ok"
            except Exception as e:
                logger.warning(f"Redis readiness check failed: {e}")
                checks["redis"] = "unhealthy"
                is_ready = False

    status_code = (
        status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE
    )

    return JSONResponse(
        status_code=status_code,
        content={
            "ready": is_ready,
            "checks": checks,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


@router.get("/health/live", tags=["health"])
async def liveness_check() -> Dict[str, str]:
    """
    Liveness probe - checks if service is alive
    Returns 200 if alive (used by Kubernetes)
    """
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}


@router.get("/health/detailed", tags=["health"])
async def detailed_health_check() -> Dict[str, Any]:
    """
    Detailed health check with configuration and dependency status
    Only available in non-production or with proper authentication
    """
    if settings.is_production:
        return {
            "status": "healthy",
            "mode": "production",
            "details": "Detailed health check disabled in production",
        }

    health_info = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "environment": {
            "demo_mode": settings.DEMO_MODE,
            "node_env": settings.NODE_ENV,
            "redis_enabled": settings.REDIS_ENABLED,
            "rasa_enabled": settings.RASA_ENABLED,
            "rate_limit_enabled": settings.RATE_LIMIT_ENABLED,
        },
        "configuration": {
            "gemini_configured": bool(settings.GEMINI_API_KEY),
            "supabase_configured": bool(
                settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY
            ),
            "redis_configured": bool(settings.REDIS_HOST)
            if settings.REDIS_ENABLED
            else None,
            "translation_provider": settings.TRANSLATION_PROVIDER,
        },
    }

    return health_info
