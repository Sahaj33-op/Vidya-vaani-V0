from typing import Union, Optional
from app.core.config import settings
from app.services.llm_service import LLMService, MockLLMService, GeminiLLMService
from app.services.storage_service import StorageService, S3StorageService, LocalStorageService, SupabaseStorageAdapter
from app.services.auth_service import AuthService, MockAuthService, SupabaseAuthService
from app.services.stt_service import STTService, MockSTTService, RealSTTService
from app.services.ocr_service import OCRService, MockOCRService, RealOCRService
from app.services.rasa_service import RasaNLUService, MockRasaNLUService
from app.services.rag_service import RAGService, MockRAGService, FAISSRAGService

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

def get_vector_store(embedding_service=None):
    """Get vector store - lazy import to avoid dependency issues in demo mode."""
    if settings.DEMO_MODE:
        # Return a mock vector store for demo mode
        return MockVectorStore()

    # Only import heavy dependencies in production mode
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from retriever.vector_store import FAISSVectorStore, SupabaseVectorStore
    from retriever.embeddings import EmbeddingService

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


class MockVectorStore:
    """Mock vector store for demo mode - returns empty results."""

    def add_documents(self, chunks):
        pass

    def search(self, query: str, top_k: int = 5, score_threshold: float = 0.0):
        return []

    def get_stats(self):
        return {'total_chunks': 0, 'index_size': 0}
