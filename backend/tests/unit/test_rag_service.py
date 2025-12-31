"""
Unit tests for RAG service
Tests MockRAGService functionality
"""

import pytest
from app.services.rag_service import MockRAGService


@pytest.mark.unit
@pytest.mark.rag
class TestMockRAGService:
    """Test suite for MockRAGService"""

    def test_initialization(self):
        """Test RAG service initializes with sample documents"""
        service = MockRAGService()
        stats = service.get_stats()

        assert stats["total_chunks"] > 0
        assert stats["mode"] == "demo"
        assert "embedding_dimension" in stats

    def test_search_basic(self):
        """Test basic search functionality"""
        service = MockRAGService()
        results = service.search("admission", top_k=5)

        assert isinstance(results, list)
        assert len(results) <= 5

        if results:
            # Check result structure
            assert "text" in results[0]
            assert "doc_id" in results[0]
            assert "score" in results[0]
            assert "metadata" in results[0]

    def test_search_with_threshold(self):
        """Test search with score threshold"""
        service = MockRAGService()

        # High threshold should return fewer results
        high_threshold_results = service.search("admission", score_threshold=0.8)
        low_threshold_results = service.search("admission", score_threshold=0.1)

        assert len(high_threshold_results) <= len(low_threshold_results)

    def test_search_keyword_matching(self):
        """Test that keyword matching works correctly"""
        service = MockRAGService()

        # Search for admission-related content
        admission_results = service.search("admission requirements", top_k=3)

        # Should find admission-related documents
        if admission_results:
            assert any("admission" in r["text"].lower() for r in admission_results)

    def test_search_hindi_keywords(self):
        """Test Hindi keyword recognition"""
        service = MockRAGService()
        results = service.search("प्रवेश", top_k=3)  # Hindi for admission

        # Should match documents with Hindi keywords
        assert isinstance(results, list)

    def test_add_documents(self):
        """Test adding new documents to the service"""
        service = MockRAGService()
        initial_count = service.get_stats()["total_chunks"]

        new_docs = [
            {
                "doc_id": "test_doc",
                "content": "Test document content",
                "metadata": {"type": "test"},
            }
        ]

        service.add_documents(new_docs)
        new_count = service.get_stats()["total_chunks"]

        assert new_count == initial_count + 1

    def test_add_documents_with_text_field(self):
        """Test adding documents with 'text' field instead of 'content'"""
        service = MockRAGService()
        initial_count = service.get_stats()["total_chunks"]

        new_docs = [
            {
                "doc_id": "test_doc_2",
                "text": "Document with text field",
                "metadata": {"type": "test"},
            }
        ]

        service.add_documents(new_docs)
        new_count = service.get_stats()["total_chunks"]

        assert new_count == initial_count + 1

    def test_get_stats(self):
        """Test statistics retrieval"""
        service = MockRAGService()
        stats = service.get_stats()

        assert "total_chunks" in stats
        assert "index_size" in stats
        assert "embedding_dimension" in stats
        assert "unique_documents" in stats
        assert "mode" in stats

        assert stats["embedding_dimension"] == 384
        assert stats["mode"] == "demo"

    def test_search_empty_query(self):
        """Test search with empty query"""
        service = MockRAGService()
        results = service.search("", top_k=5)

        # Empty query might return no results
        assert isinstance(results, list)

    def test_search_top_k_limit(self):
        """Test that top_k limits results correctly"""
        service = MockRAGService()

        results_k3 = service.search("college", top_k=3)
        results_k10 = service.search("college", top_k=10)

        assert len(results_k3) <= 3
        assert len(results_k10) <= 10

    def test_search_score_ordering(self):
        """Test that results are ordered by score (descending)"""
        service = MockRAGService()
        results = service.search("admission process documents", top_k=5)

        if len(results) > 1:
            # Scores should be in descending order
            scores = [r["score"] for r in results]
            assert scores == sorted(scores, reverse=True)

    def test_search_result_contains_metadata(self):
        """Test that search results include metadata"""
        service = MockRAGService()
        results = service.search("fees", top_k=2)

        if results:
            for result in results:
                assert "metadata" in result
                assert isinstance(result["metadata"], dict)
