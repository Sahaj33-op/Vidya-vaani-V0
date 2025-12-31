import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.api import api_router
from app.core.config import settings
from app.dependencies import (
    get_auth_service,
    get_llm_service,
    get_ocr_service,
    get_storage_service,
    get_stt_service,
)
from app.middleware.metrics import (
    PrometheusMetricsMiddleware,
    get_metrics,
    get_metrics_content_type,
)
from app.middleware.rate_limit import RateLimitMiddleware

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    if settings.LOG_FORMAT == "text"
    else '{"time":"%(asctime)s","name":"%(name)s","level":"%(levelname)s","message":"%(message)s"}',
    stream=sys.stdout,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    await validate_production_config()
    logger.info(f"Starting {settings.PROJECT_NAME} server")
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME} server")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

allowed_origins = settings.get_allowed_origins()
if settings.DEMO_MODE:
    allowed_origins.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.RATE_LIMIT_ENABLED:
    app.add_middleware(
        RateLimitMiddleware,
        requests_per_minute=settings.RATE_LIMIT_REQUESTS_PER_MINUTE,
        burst=settings.RATE_LIMIT_BURST,
    )
    logger.info(
        f"Rate limiting enabled: {settings.RATE_LIMIT_REQUESTS_PER_MINUTE} requests/minute"
    )

if settings.ENABLE_METRICS:
    app.add_middleware(PrometheusMetricsMiddleware)
    logger.info("Prometheus metrics enabled")


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    from fastapi.responses import Response

    return Response(content=get_metrics(), media_type=get_metrics_content_type())


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with proper logging"""
    logger.error(
        f"HTTP error: {exc.status_code} - {exc.detail} - Path: {request.url.path}"
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "path": str(request.url.path)},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors"""
    logger.warning(f"Validation error on {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": str(exc.body)},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.error(
        f"Unhandled exception on {request.url.path}: {str(exc)}", exc_info=True
    )

    if settings.is_production:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"},
        )
    else:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": str(exc), "type": type(exc).__name__},
        )


async def validate_production_config():
    """Validate required configuration for production mode"""
    if not settings.DEMO_MODE:
        logger.info("Running in PRODUCTION mode - validating configuration...")

        missing_configs = []

        if not settings.GEMINI_API_KEY:
            missing_configs.append("GEMINI_API_KEY")

        if not settings.SUPABASE_URL:
            missing_configs.append("SUPABASE_URL")

        if not settings.SUPABASE_SERVICE_KEY:
            missing_configs.append("SUPABASE_SERVICE_KEY")

        if settings.REDIS_ENABLED and not settings.REDIS_HOST:
            missing_configs.append("REDIS_HOST")

        if settings.is_production and not settings.SECRET_KEY:
            missing_configs.append("SECRET_KEY")

        if missing_configs:
            error_msg = f"Missing required configuration for production: {', '.join(missing_configs)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

        logger.info("Production configuration validated successfully")
    else:
        logger.info("Running in DEMO mode - using mock services")


app.include_router(api_router, prefix=settings.API_V1_STR)
