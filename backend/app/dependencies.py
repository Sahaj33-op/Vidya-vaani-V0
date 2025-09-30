from typing import Union
from app.core.config import settings
from app.services.llm_service import MockLLMService, GeminiLLMService
from app.services.storage_service import MockStorageService, S3StorageService
from app.services.auth_service import MockAuthService, SupabaseAuthService
from app.services.stt_service import MockSTTService, RealSTTService
from app.services.ocr_service import MockOCRService, RealOCRService
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from retriever.vector_store import FAISSVectorStore, SupabaseVectorStore
from retriever.embeddings import EmbeddingService

def get_llm_service() -> LLMService:
    if settings.DEMO_MODE:
        return MockLLMService()
    return GeminiLLMService()

def get_storage_service() -> StorageService:
    if settings.DEMO_MODE:
        return LocalStorageService(storage_path="./local_storage")
    return SupabaseStorageAdapter()

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

def get_vector_store(embedding_service: EmbeddingService) -> Union[FAISSVectorStore, SupabaseVectorStore]:
    if settings.DEMO_MODE:
        return FAISSVectorStore(embedding_service=embedding_service)
    return SupabaseVectorStore(embedding_service=embedding_service)
