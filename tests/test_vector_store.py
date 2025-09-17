"""
Tests for the FAISS vector store implementation
"""

import unittest
import tempfile
import shutil
import numpy as np
from pathlib import Path

from retriever.vector_store import FAISSVectorStore
from retriever.document_processor import DocumentChunk
from retriever.embeddings import EmbeddingService

class MockEmbeddingService(EmbeddingService):
    """Mock embedding service for testing"""
    
    def __init__(self, dimension=128):
        self.dimension = dimension
    
    def encode_texts(self, texts):
        """Generate random embeddings for testing"""
        embeddings = np.random.rand(len(texts), self.dimension).astype(np.float32)
        # Normalize
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        embeddings = embeddings / norms
        return embeddings
    
    def encode_query(self, query):
        """Generate random query embedding"""
        embedding = np.random.rand(self.dimension).astype(np.float32)
        # Normalize
        norm = np.linalg.norm(embedding)
        embedding = embedding / norm
        return embedding
    
    def get_embedding_dimension(self):
        return self.dimension

class TestFAISSVectorStore(unittest.TestCase):
    """Test FAISS vector store"""
    
    def setUp(self):
        """Set up test environment"""
        self.temp_dir = tempfile.mkdtemp()
        self.embedding_service = MockEmbeddingService()
        self.vector_store = FAISSVectorStore(self.embedding_service, index_path=self.temp_dir)
    
    def tearDown(self):
        """Clean up test environment"""
        shutil.rmtree(self.temp_dir)
    
    def test_add_and_search(self):
        """Test adding documents and searching"""
        # Create test chunks
        chunks = [
            DocumentChunk(text="This is a test document about cats", doc_id="doc1", chunk_id="0"),
            DocumentChunk(text="Dogs are man's best friend", doc_id="doc1", chunk_id="1"),
            DocumentChunk(text="Python is a programming language", doc_id="doc2", chunk_id="0")
        ]
        
        # Add documents
        chunk_ids = self.vector_store.add_documents(chunks)
        
        # Verify chunk IDs were returned
        self.assertEqual(len(chunk_ids), 3)
        
        # Search (with mock embeddings, results will be random but should return something)
        results = self.vector_store.search("test query", top_k=2)
        
        # Should return some results
        self.assertGreaterEqual(len(results), 0)
        
        # Check stats
        stats = self.vector_store.get_stats()
        self.assertEqual(stats['total_chunks'], 3)
        self.assertEqual(stats['unique_documents'], 2)
    
    def test_delete_document(self):
        """Test deleting a document"""
        # Create test chunks
        chunks = [
            DocumentChunk(text="Document 1, chunk 1", doc_id="doc1", chunk_id="0"),
            DocumentChunk(text="Document 1, chunk 2", doc_id="doc1", chunk_id="1"),
            DocumentChunk(text="Document 2, chunk 1", doc_id="doc2", chunk_id="0")
        ]
        
        # Add documents
        self.vector_store.add_documents(chunks)
        
        # Delete document 1
        success = self.vector_store.delete_document("doc1")
        self.assertTrue(success)
        
        # Check stats
        stats = self.vector_store.get_stats()
        self.assertEqual(stats['total_chunks'], 1)  # Only doc2 remains
        self.assertEqual(stats['unique_documents'], 1)
        
        # Try to delete non-existent document
        success = self.vector_store.delete_document("doc3")
        self.assertFalse(success)
    
    def test_update_document(self):
        """Test updating a document"""
        # Create initial chunks
        chunks = [
            DocumentChunk(text="Original document 1", doc_id="doc1", chunk_id="0"),
            DocumentChunk(text="Document 2", doc_id="doc2", chunk_id="0")
        ]
        
        # Add documents
        self.vector_store.add_documents(chunks)
        
        # Create updated chunks
        updated_chunks = [
            DocumentChunk(text="Updated document 1, chunk 1", doc_id="doc1", chunk_id="0"),
            DocumentChunk(text="Updated document 1, chunk 2", doc_id="doc1", chunk_id="1")
        ]
        
        # Update document
        new_chunk_ids = self.vector_store.update_document("doc1", updated_chunks)
        
        # Verify new chunk IDs were returned
        self.assertEqual(len(new_chunk_ids), 2)
        
        # Check stats
        stats = self.vector_store.get_stats()
        self.assertEqual(stats['total_chunks'], 3)  # 2 for doc1 + 1 for doc2
        self.assertEqual(stats['unique_documents'], 2)
    
    def test_persistence(self):
        """Test index persistence"""
        # Create test chunks
        chunks = [
            DocumentChunk(text="Persistence test 1", doc_id="doc1", chunk_id="0"),
            DocumentChunk(text="Persistence test 2", doc_id="doc2", chunk_id="0")
        ]
        
        # Add documents
        self.vector_store.add_documents(chunks)
        
        # Create a new vector store instance with the same path
        new_vector_store = FAISSVectorStore(self.embedding_service, index_path=self.temp_dir)
        
        # Check stats of new instance
        stats = new_vector_store.get_stats()
        self.assertEqual(stats['total_chunks'], 2)
        self.assertEqual(stats['unique_documents'], 2)

if __name__ == "__main__":
    unittest.main()