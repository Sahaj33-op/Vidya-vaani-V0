"""
Pytest configuration and fixtures for backend tests
Provides common test fixtures and utilities
"""

import sys
from pathlib import Path
from typing import Generator

import pytest
from fastapi.testclient import TestClient

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings
from app.main import app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """
    Create a test client for FastAPI application

    Usage:
        def test_health(client):
            response = client.get("/api/v1/admin/health")
            assert response.status_code == 200
    """
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def demo_mode():
    """Ensure tests run in demo mode by default"""
    original_demo_mode = settings.DEMO_MODE
    settings.DEMO_MODE = True
    yield
    settings.DEMO_MODE = original_demo_mode


@pytest.fixture
def mock_llm_service():
    """Provide a mock LLM service for testing"""
    from app.services.llm_service import MockLLMService

    return MockLLMService()


@pytest.fixture
def mock_rag_service():
    """Provide a mock RAG service for testing"""
    from app.services.rag_service import MockRAGService

    return MockRAGService()


@pytest.fixture
def mock_translation_service():
    """Provide a mock translation service for testing"""
    from app.services.translation_service import MockTranslationService

    return MockTranslationService()


@pytest.fixture
def sample_chat_request():
    """Sample chat request payload"""
    return {
        "message": "What are the admission requirements?",
        "language": "en",
        "session_id": "test-session-123",
    }


@pytest.fixture
def sample_rag_search_request():
    """Sample RAG search request payload"""
    return {"query": "admission requirements", "top_k": 5, "score_threshold": 0.3}


@pytest.fixture
def sample_documents():
    """Sample documents for RAG testing"""
    return [
        {
            "doc_id": "test_doc_1",
            "content": "Test document content about admissions",
            "metadata": {"type": "admission", "category": "process"},
        },
        {
            "doc_id": "test_doc_2",
            "content": "Test document content about fees",
            "metadata": {"type": "fees", "category": "structure"},
        },
    ]


@pytest.fixture
def sample_translation_request():
    """Sample translation request payload"""
    return {
        "text": "Hello, how are you?",
        "source_language": "en",
        "target_language": "hi",
    }


# Pytest configuration hooks


def pytest_configure(config):
    """Configure pytest with custom markers and settings"""
    config.addinivalue_line("markers", "unit: Unit tests for individual components")
    config.addinivalue_line(
        "markers", "integration: Integration tests for API endpoints"
    )
    config.addinivalue_line("markers", "rag: Tests for RAG system")
    config.addinivalue_line("markers", "llm: Tests that require LLM API")
