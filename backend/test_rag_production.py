"""
Test script for Production RAG System with FAISS
Tests embedding generation, vector store operations, and search functionality
"""

import os
import sys
from pathlib import Path

# Add parent directory to path to import from retriever
sys.path.insert(0, str(Path(__file__).parent.parent))

import logging

from app.services.rag_service import FAISSRAGService

from retriever.document_processor import DocumentChunk, DocumentProcessor
from retriever.embeddings import EmbeddingService
from retriever.vector_store import FAISSVectorStore

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def test_embedding_service():
    """Test embedding service initialization and encoding"""
    logger.info("=" * 60)
    logger.info("TEST 1: Embedding Service")
    logger.info("=" * 60)

    try:
        # Initialize embedding service
        embedding_service = EmbeddingService()

        # Test encoding
        test_texts = [
            "What are the admission requirements?",
            "प्रवेश की आवश्यकताएं क्या हैं?",  # Hindi
            "फीस रचना काय आहे?",  # Marathi
        ]

        logger.info(f"Encoding {len(test_texts)} test texts...")
        embeddings = embedding_service.encode_texts(test_texts)

        logger.info(f"✓ Embeddings shape: {embeddings.shape}")
        logger.info(
            f"✓ Embedding dimension: {embedding_service.get_embedding_dimension()}"
        )

        # Test query encoding
        query = "Tell me about fees"
        query_embedding = embedding_service.encode_query(query)
        logger.info(f"✓ Query embedding shape: {query_embedding.shape}")

        logger.info("✓ Embedding service test PASSED\n")
        return embedding_service

    except Exception as e:
        logger.error(f"✗ Embedding service test FAILED: {e}")
        raise


def test_document_processor():
    """Test document processing and chunking"""
    logger.info("=" * 60)
    logger.info("TEST 2: Document Processor")
    logger.info("=" * 60)

    try:
        processor = DocumentProcessor(chunk_size=500, chunk_overlap=50)

        # Test document
        sample_doc = """
        Admission Requirements for 2024-25

        Our college welcomes students from diverse backgrounds. The admission process
        is designed to be fair and transparent. All applicants must submit their
        10th and 12th standard mark sheets along with other required documents.

        Required Documents:
        1. Mark sheets from 10th and 12th standard
        2. Transfer certificate from previous institution
        3. Character certificate
        4. Caste certificate (if applicable)
        5. Income certificate for scholarship
        6. Passport size photographs
        7. Aadhar card photocopy

        The application fee is ₹500 and must be paid online through our portal.
        """

        chunks = processor.process_text(sample_doc, doc_id="test_doc")

        logger.info(f"✓ Created {len(chunks)} chunks from sample document")
        logger.info(f"✓ First chunk preview: {chunks[0].text[:100]}...")

        logger.info("✓ Document processor test PASSED\n")
        return processor, chunks

    except Exception as e:
        logger.error(f"✗ Document processor test FAILED: {e}")
        raise


def test_faiss_vector_store(embedding_service, chunks):
    """Test FAISS vector store operations"""
    logger.info("=" * 60)
    logger.info("TEST 3: FAISS Vector Store")
    logger.info("=" * 60)

    try:
        # Use a test index path
        test_index_path = "data/test_faiss_index"
        vector_store = FAISSVectorStore(embedding_service, test_index_path)

        # Add documents
        logger.info(f"Adding {len(chunks)} chunks to vector store...")
        vector_store.add_documents(chunks)

        # Get stats
        stats = vector_store.get_stats()
        logger.info(f"✓ Vector store stats: {stats}")

        # Test search
        test_queries = [
            "What documents are required for admission?",
            "How much is the application fee?",
            "Tell me about mark sheets",
        ]

        for query in test_queries:
            logger.info(f"\nSearching for: '{query}'")
            results = vector_store.search(query, top_k=3, score_threshold=0.0)

            if results:
                logger.info(f"✓ Found {len(results)} results")
                for i, result in enumerate(results, 1):
                    logger.info(f"  {i}. Score: {result['score']:.3f}")
                    logger.info(f"     Text: {result['text'][:100]}...")
            else:
                logger.warning(f"  No results found")

        logger.info("\n✓ FAISS vector store test PASSED\n")
        return vector_store

    except Exception as e:
        logger.error(f"✗ FAISS vector store test FAILED: {e}")
        raise


def test_rag_service_integration():
    """Test complete RAG service (production mode simulation)"""
    logger.info("=" * 60)
    logger.info("TEST 4: RAG Service Integration")
    logger.info("=" * 60)

    try:
        # Create RAG service
        rag_service = FAISSRAGService(index_path="data/test_faiss_index_2")

        # Test with sample educational documents
        sample_documents = [
            {
                "doc_id": "fees_2024",
                "content": """Fee Structure 2024-25

                Engineering: ₹75,000 per year
                Arts & Science: ₹35,000 per year
                Commerce: ₹40,000 per year

                Payment can be made in two installments.
                """,
                "metadata": {"type": "fees", "year": "2024-25"},
            },
            {
                "doc_id": "hostel_info",
                "content": """Hostel Facilities

                Boys Hostel: ₹35,000 per year
                Girls Hostel: ₹40,000 per year
                Includes accommodation and basic facilities.
                Mess charges are additional ₹25,000 per year.
                """,
                "metadata": {"type": "facilities", "category": "hostel"},
            },
        ]

        # Add documents
        logger.info(f"Adding {len(sample_documents)} documents...")
        rag_service.add_documents(sample_documents)

        # Get stats
        stats = rag_service.get_stats()
        logger.info(f"✓ RAG service stats: {stats}")

        # Test search
        test_queries = [
            "How much is the engineering fee?",
            "What is the hostel cost?",
            "Tell me about payment options",
        ]

        for query in test_queries:
            logger.info(f"\nQuery: '{query}'")
            results = rag_service.search(query, top_k=3, score_threshold=0.2)

            if results:
                logger.info(f"✓ Found {len(results)} relevant documents")
                for i, result in enumerate(results, 1):
                    logger.info(
                        f"  {i}. [{result['doc_id']}] Score: {result['score']:.3f}"
                    )
                    logger.info(f"     {result['text'][:150]}...")
            else:
                logger.warning(f"  No results found")

        logger.info("\n✓ RAG service integration test PASSED\n")

    except Exception as e:
        logger.error(f"✗ RAG service integration test FAILED: {e}")
        raise


def test_multilingual_search():
    """Test multilingual search capabilities"""
    logger.info("=" * 60)
    logger.info("TEST 5: Multilingual Search")
    logger.info("=" * 60)

    try:
        rag_service = FAISSRAGService(index_path="data/test_faiss_index_3")

        # Add multilingual content
        multilingual_docs = [
            {
                "doc_id": "fees_multi",
                "content": """Fees and Charges

                The college fee structure is affordable and transparent.
                फीस संरचना सस्ती और पारदर्शी है।
                शुल्क रचना परवडणारी आणि पारदर्शक आहे.
                """,
                "metadata": {"type": "fees", "multilingual": True},
            }
        ]

        rag_service.add_documents(multilingual_docs)

        # Test queries in different languages
        queries = [
            ("What are the fees?", "English"),
            ("फीस कितनी है?", "Hindi"),
            ("शुल्क किती आहे?", "Marathi"),
        ]

        for query, lang in queries:
            logger.info(f"\nQuery ({lang}): '{query}'")
            results = rag_service.search(query, top_k=2, score_threshold=0.1)

            if results:
                logger.info(f"✓ Found {len(results)} results")
                logger.info(f"  Top result score: {results[0]['score']:.3f}")
            else:
                logger.warning(f"  No results found")

        logger.info("\n✓ Multilingual search test PASSED\n")

    except Exception as e:
        logger.error(f"✗ Multilingual search test FAILED: {e}")
        raise


def cleanup_test_indices():
    """Clean up test indices"""
    logger.info("=" * 60)
    logger.info("Cleaning up test indices...")
    logger.info("=" * 60)

    import shutil

    test_paths = [
        "data/test_faiss_index",
        "data/test_faiss_index_2",
        "data/test_faiss_index_3",
    ]

    for path in test_paths:
        if os.path.exists(path):
            shutil.rmtree(path)
            logger.info(f"✓ Removed {path}")

    logger.info("✓ Cleanup complete\n")


def main():
    """Run all tests"""
    logger.info("\n" + "=" * 60)
    logger.info("PRODUCTION RAG SYSTEM TEST SUITE")
    logger.info("=" * 60 + "\n")

    try:
        # Run tests
        embedding_service = test_embedding_service()
        processor, chunks = test_document_processor()
        vector_store = test_faiss_vector_store(embedding_service, chunks)
        test_rag_service_integration()
        test_multilingual_search()

        # Cleanup
        cleanup_test_indices()

        logger.info("=" * 60)
        logger.info("✓ ALL TESTS PASSED!")
        logger.info("=" * 60)
        logger.info("\nProduction RAG system is ready to use.")
        logger.info("To enable in your backend:")
        logger.info("1. Set DEMO_MODE=false in backend/.env")
        logger.info("2. Ensure GEMINI_API_KEY is set")
        logger.info("3. Restart FastAPI server")
        logger.info("=" * 60 + "\n")

        return True

    except Exception as e:
        logger.error("\n" + "=" * 60)
        logger.error("✗ TEST SUITE FAILED")
        logger.error("=" * 60)
        logger.error(f"Error: {e}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
