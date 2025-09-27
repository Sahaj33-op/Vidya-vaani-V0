from fastapi import FastAPI
from app.api.v1.api import api_router
from app.core.config import settings
from app.dependencies import get_llm_service, get_storage_service, get_stt_service, get_ocr_service, get_auth_service

app = FastAPI(title=settings.PROJECT_NAME)

app.include_router(api_router, prefix=settings.API_V1_STR)
