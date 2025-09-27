from app.core.config import settings
from app.services.llm_service import LLMService, MockLLMService, GeminiLLMService
from app.services.storage_service import StorageService, LocalStorageService, S3StorageService
from app.services.stt_service import STTService, MockSTTService, RealSTTService
from app.services.ocr_service import OCRService, MockOCRService, RealOCRService
from app.core.security import AuthService, MockAuthService, SupabaseAuthService

def get_llm_service() -> LLMService:
    if settings.DEMO_MODE:
        return MockLLMService()
    return GeminiLLMService()

def get_storage_service() -> StorageService:
    if settings.DEMO_MODE:
        return LocalStorageService(storage_path="./local_storage")
    return S3StorageService()

def get_stt_service() -> STTService:
    if settings.DEMO_MODE:
        return MockSTTService()
    return RealSTTService()

def get_ocr_service() -> OCRService:
    if settings.DEMO_MODE:
        return MockOCRService()
    return RealOCRService()

def get_auth_service() -> AuthService:
    if settings.DEMO_MODE:
        return MockAuthService()
    return SupabaseAuthService()
