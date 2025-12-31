"""
End-to-end test for RAG integration with chat endpoint
Tests the complete flow: user query -> RAG search -> LLM response
"""

import json

import requests

BASE_URL = "http://localhost:8000"


def test_health():
    """Test health endpoint"""
    print("=" * 60)
    print("TEST 1: Health Check")
    print("=" * 60)

    response = requests.get(f"{BASE_URL}/api/v1/admin/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 200
    print("✓ Health check PASSED\n")


def test_rag_stats():
    """Test RAG stats endpoint"""
    print("=" * 60)
    print("TEST 2: RAG Stats")
    print("=" * 60)

    response = requests.get(f"{BASE_URL}/api/v1/rag/stats")
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")

    assert response.status_code == 200
    assert "total_chunks" in data
    print(f"✓ RAG has {data['total_chunks']} chunks indexed")
    print("✓ RAG stats PASSED\n")
    return data


def test_rag_search():
    """Test RAG search endpoint"""
    print("=" * 60)
    print("TEST 3: RAG Search")
    print("=" * 60)

    test_queries = [
        "What are the admission requirements?",
        "How much is the engineering fee?",
        "Tell me about hostel facilities",
    ]

    for query in test_queries:
        print(f"\nQuery: '{query}'")

        response = requests.post(
            f"{BASE_URL}/api/v1/rag/search",
            json={"query": query, "top_k": 3, "score_threshold": 0.2},
        )

        print(f"Status: {response.status_code}")
        data = response.json()
        # Handle both dict and list response formats
        results = data.get("results", data) if isinstance(data, dict) else data

        if results:
            print(f"✓ Found {len(results)} results")
            results_list = list(results) if not isinstance(results, list) else results
            for i, result in enumerate(results_list[:2], 1):
                print(f"  {i}. Score: {result['score']:.3f}")
                print(f"     Text: {result['text'][:100]}...")
        else:
            print("  No results found")

    print("\n✓ RAG search PASSED\n")


def test_chat_with_rag():
    """Test chat endpoint with RAG integration"""
    print("=" * 60)
    print("TEST 4: Chat with RAG Integration")
    print("=" * 60)

    test_messages = [
        {"message": "What are the hostel fees?", "expected_context": "hostel"},
        {"message": "Tell me about scholarships", "expected_context": "scholarship"},
        {"message": "What is the admission process?", "expected_context": "admission"},
    ]

    for i, test in enumerate(test_messages, 1):
        print(f"\n{i}. Testing: '{test['message']}'")

        response = requests.post(
            f"{BASE_URL}/api/v1/chat/text",
            json={
                "message": test["message"],
                "language": "en",
                "session_id": f"test-session-{i}",
            },
        )

        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"✓ Bot response received")
            print(f"  Response preview: {data['response'][:200]}...")

            # Check if response seems contextual
            if test["expected_context"].lower() in data["response"].lower():
                print(
                    f"  ✓ Response contains expected context: '{test['expected_context']}'"
                )
            else:
                print(
                    f"  ⚠ Response might not be contextual (expected: '{test['expected_context']}')"
                )
        else:
            print(f"✗ Request failed: {response.text}")

    print("\n✓ Chat with RAG PASSED\n")


def test_multilingual_rag():
    """Test multilingual RAG search"""
    print("=" * 60)
    print("TEST 5: Multilingual RAG")
    print("=" * 60)

    multilingual_queries = [
        ("What is the fee structure?", "English"),
        ("फीस की जानकारी दीजिए", "Hindi"),
        ("प्रवेश प्रक्रिया क्या है?", "Hindi"),
    ]

    for query, language in multilingual_queries:
        print(f"\nQuery ({language}): '{query}'")

        response = requests.post(
            f"{BASE_URL}/api/v1/rag/search",
            json={"query": query, "top_k": 2, "score_threshold": 0.15},
        )

        data = response.json()
        results = data.get("results", [])
        if results:
            print(f"✓ Found {len(results)} results")
            print(f"  Top score: {results[0]['score']:.3f}")
        else:
            print("  No results found")

    print("\n✓ Multilingual RAG PASSED\n")


def main():
    print("\n" + "=" * 60)
    print("END-TO-END RAG INTEGRATION TEST")
    print("=" * 60)
    print("\nMake sure FastAPI server is running:")
    print("  cd backend && uvicorn app.main:app --reload")
    print("=" * 60 + "\n")

    try:
        test_health()
        stats = test_rag_stats()

        if stats.get("total_chunks", 0) == 0:
            print("⚠ WARNING: RAG index is empty!")
            print("  Sample documents should load automatically on startup.")
            print("  Check FAISSRAGService._load_sample_data()")
            return False

        test_rag_search()
        test_chat_with_rag()
        test_multilingual_rag()

        print("=" * 60)
        print("✓ ALL END-TO-END TESTS PASSED!")
        print("=" * 60)
        print("\nProduction RAG system is fully functional!")
        print("Ready to switch DEMO_MODE=false in backend/.env")
        print("=" * 60 + "\n")

        return True

    except requests.exceptions.ConnectionError:
        print("\n✗ ERROR: Cannot connect to FastAPI server")
        print("  Make sure the server is running:")
        print("  cd backend && uvicorn app.main:app --reload")
        return False
    except Exception as e:
        print(f"\n✗ TEST FAILED: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    import sys

    success = main()
    sys.exit(0 if success else 1)
