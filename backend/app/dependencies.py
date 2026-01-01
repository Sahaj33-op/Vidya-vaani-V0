from typing import Optional, Union

from app.core.config import settings
from app.services.auth_service import AuthService, MockAuthService, SupabaseAuthService
from app.services.llm_service import GeminiLLMService, LLMService, MockLLMService
from app.services.ocr_service import MockOCRService, OCRService, RealOCRService
from app.services.rag_service import FAISSRAGService, MockRAGService, RAGService
from app.services.rasa_service import MockRasaNLUService, RasaNLUService
from app.services.storage_service import (
    LocalStorageService,
    S3StorageService,
    StorageService,
    SupabaseStorageAdapter,
)
from app.services.stt_service import MockSTTService, RealSTTService, STTService
from app.services.translation_service import (
    LangdetectTranslationService,
    MockTranslationService,
    TranslationService,
)


def get_llm_service() -> LLMService:
    if settings.DEMO_MODE:
        return MockLLMService()
    return GeminiLLMService()


def get_storage_service() -> StorageService:
    # For hackathon: Always use local storage (no Supabase needed)
    return LocalStorageService(storage_path="./local_storage")


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


def get_vector_store(embedding_service=None):
    """Get vector store - lazy import to avoid dependency issues in demo mode."""
    if settings.DEMO_MODE:
        # Return a mock vector store for demo mode
        return MockVectorStore()

    # Only import heavy dependencies in production mode
    import os
    import sys

    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from retriever.embeddings import EmbeddingService
    from retriever.vector_store import FAISSVectorStore, SupabaseVectorStore

    if embedding_service is None:
        embedding_service = EmbeddingService()
    return SupabaseVectorStore(embedding_service=embedding_service)


def get_rasa_service():
    if settings.DEMO_MODE:
        return MockRasaNLUService()
    return RasaNLUService(settings.RASA_API_URL)


# Singleton instance for RAG service to avoid reloading embeddings
_rag_service_instance: Optional[RAGService] = None


def get_rag_service() -> RAGService:
    """Get RAG service - uses singleton pattern to avoid reloading embeddings."""
    global _rag_service_instance

    if _rag_service_instance is None:
        if settings.DEMO_MODE:
            _rag_service_instance = MockRAGService()
        else:
            _rag_service_instance = FAISSRAGService()

    return _rag_service_instance


# Singleton instance for Translation service
_translation_service_instance: Optional[TranslationService] = None


def get_translation_service() -> TranslationService:
    """Get translation service - uses singleton pattern."""
    global _translation_service_instance

    if _translation_service_instance is None:
        if settings.DEMO_MODE:
            _translation_service_instance = MockTranslationService()
        else:
            _translation_service_instance = LangdetectTranslationService()

    return _translation_service_instance


class MockVectorStore:
    """Mock vector store for demo mode - returns empty results."""

    def add_documents(self, chunks):
        pass

    def search(self, query: str, top_k: int = 5, score_threshold: float = 0.0):
        return []

    def get_stats(self):
        return {"total_chunks": 0, "index_size": 0}
