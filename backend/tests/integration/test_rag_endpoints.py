"""
Integration tests for RAG API endpoints
Tests /api/v1/rag/* endpoints
"""

import pytest
from fastapi.testclient import TestClient


@pytest.mark.integration
@pytest.mark.rag
class TestRAGEndpoints:
    """Test suite for RAG API endpoints"""

    def test_rag_stats_endpoint(self, client, demo_mode):
        """Test GET /api/v1/rag/stats endpoint"""
        response = client.get("/api/v1/rag/stats")

        assert response.status_code == 200
        data = response.json()

        assert "total_chunks" in data
        assert "index_size" in data
        assert "embedding_dimension" in data
        assert "mode" in data

        assert data["embedding_dimension"] == 384
        assert data["mode"] in ["demo", "faiss"]

    def test_rag_search_endpoint(self, client, demo_mode, sample_rag_search_request):
        """Test POST /api/v1/rag/search endpoint"""
        response = client.post("/api/v1/rag/search", json=sample_rag_search_request)

        assert response.status_code == 200
        data = response.json()

        assert "query" in data
        assert "results" in data
        assert "total_results" in data
        assert "sources" in data

        assert data["query"] == sample_rag_search_request["query"]
        assert isinstance(data["results"], list)
        assert isinstance(data["sources"], list)

    def test_rag_search_with_results(self, client, demo_mode):
        """Test RAG search returns properly formatted results"""
        request = {
            "query": "admission requirements",
            "top_k": 3,
            "score_threshold": 0.2,
        }

        response = client.post("/api/v1/rag/search", json=request)
        assert response.status_code == 200

        data = response.json()
        results = data["results"]

        if results:
            # Check first result structure
            result = results[0]
            assert "text" in result
            assert "doc_id" in result
            assert "chunk_id" in result
            assert "score" in result
            assert "metadata" in result

            # Check data types
            assert isinstance(result["text"], str)
            assert isinstance(result["score"], (int, float))
            assert isinstance(result["metadata"], dict)

    def test_rag_search_validation_min_length(self, client, demo_mode):
        """Test query validation - minimum length"""
        request = {
            "query": "",  # Empty query
            "top_k": 5,
        }

        response = client.post("/api/v1/rag/search", json=request)
        assert response.status_code == 422  # Validation error

    def test_rag_search_validation_top_k(self, client, demo_mode):
        """Test top_k parameter validation"""
        # Test top_k too high
        request = {
            "query": "test query",
            "top_k": 100,  # Max is 20
        }

        response = client.post("/api/v1/rag/search", json=request)
        assert response.status_code == 422

        # Test top_k too low
        request["top_k"] = 0
        response = client.post("/api/v1/rag/search", json=request)
        assert response.status_code == 422

    def test_rag_search_validation_score_threshold(self, client, demo_mode):
        """Test score_threshold parameter validation"""
        # Test threshold too high
        request = {
            "query": "test query",
            "score_threshold": 1.5,  # Max is 1.0
        }

        response = client.post("/api/v1/rag/search", json=request)
        assert response.status_code == 422

        # Test threshold negative
        request["score_threshold"] = -0.1
        response = client.post("/api/v1/rag/search", json=request)
        assert response.status_code == 422

    def test_rag_add_documents_endpoint(self, client, demo_mode, sample_documents):
        """Test POST /api/v1/rag/add endpoint"""
        request = {"documents": sample_documents}

        response = client.post("/api/v1/rag/add", json=request)

        assert response.status_code == 200
        data = response.json()

        assert "message" in data
        assert "documents_added" in data
        assert data["documents_added"] == len(sample_documents)

    def test_rag_add_then_search(self, client, demo_mode):
        """Test adding documents and then searching for them"""
        # Add a document
        new_doc = {
            "documents": [
                {
                    "doc_id": "unique_test_doc",
                    "content": "This is a unique test document about quantum physics",
                    "metadata": {"type": "test", "category": "science"},
                }
            ]
        }

        add_response = client.post("/api/v1/rag/add", json=new_doc)
        assert add_response.status_code == 200

        # Search for the document
        search_request = {
            "query": "quantum physics",
            "top_k": 10,
            "score_threshold": 0.1,
        }

        search_response = client.post("/api/v1/rag/search", json=search_request)
        assert search_response.status_code == 200

        # Note: In demo mode with keyword matching, this should work
        # In production with embeddings, results may vary

    def test_rag_query_endpoint(self, client, demo_mode):
        """Test POST /api/v1/rag/query endpoint for LLM context"""
        request = {"query": "admission process", "top_k": 3, "score_threshold": 0.2}

        response = client.post("/api/v1/rag/query", json=request)

        assert response.status_code == 200
        data = response.json()

        assert "query" in data
        assert "context" in data
        assert "sources" in data
        assert "confidence" in data
        assert "has_context" in data

        assert isinstance(data["context"], list)
        assert isinstance(data["sources"], list)
        assert isinstance(data["confidence"], (int, float))
        assert isinstance(data["has_context"], bool)

    def test_rag_query_context_format(self, client, demo_mode):
        """Test that query endpoint returns properly formatted context"""
        request = {"query": "fees information", "top_k": 2}

        response = client.post("/api/v1/rag/query", json=request)
        assert response.status_code == 200

        data = response.json()

        # Context should be list of strings (text chunks)
        for context_chunk in data["context"]:
            assert isinstance(context_chunk, str)
            assert len(context_chunk) > 0

    def test_rag_search_multilingual(self, client, demo_mode):
        """Test RAG search with multilingual queries"""
        queries = [
            "What are the fees?",  # English
            "फीस कितनी है?",  # Hindi
            "प्रवेश कैसे करें?",  # Hindi
        ]

        for query in queries:
            request = {"query": query, "top_k": 3, "score_threshold": 0.1}

            response = client.post("/api/v1/rag/search", json=request)
            assert response.status_code == 200

            data = response.json()
            assert "results" in data
            assert isinstance(data["results"], list)

    def test_rag_search_different_score_thresholds(self, client, demo_mode):
        """Test that different score thresholds affect result count"""
        base_request = {"query": "college information", "top_k": 10}

        # Low threshold
        low_threshold = {**base_request, "score_threshold": 0.1}
        low_response = client.post("/api/v1/rag/search", json=low_threshold)
        low_count = low_response.json()["total_results"]

        # High threshold
        high_threshold = {**base_request, "score_threshold": 0.7}
        high_response = client.post("/api/v1/rag/search", json=high_threshold)
        high_count = high_response.json()["total_results"]

        # Higher threshold should return fewer or equal results
        assert high_count <= low_count

    def test_rag_endpoint_error_handling(self, client, demo_mode):
        """Test error handling for invalid requests"""
        # Missing required field
        response = client.post("/api/v1/rag/search", json={})
        assert response.status_code == 422

        # Invalid JSON
        response = client.post(
            "/api/v1/rag/search",
            data="invalid json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422
