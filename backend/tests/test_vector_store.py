import unittest
from unittest.mock import MagicMock, patch
from retriever.vector_store import SupabaseVectorStore
from retriever.embeddings import EmbeddingService
from retriever.document_processor import DocumentChunk
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, text

class TestSupabaseVectorStore(unittest.TestCase):

    @patch('retriever.vector_store.create_engine')
    @patch('retriever.vector_store.sessionmaker')
    @patch('retriever.vector_store.settings')
    def setUp(self, mock_settings, mock_sessionmaker, mock_create_engine):
        mock_settings.SUPABASE_URL = "https://test.supabase.co"
        mock_settings.SUPABASE_SERVICE_KEY = "test_key"

        self.mock_engine = MagicMock()
        mock_create_engine.return_value = self.mock_engine

        self.mock_session = MagicMock()
        self.mock_session.execute.return_value = self.mock_session
        self.mock_session.scalar.return_value = 10 # For get_stats
        self.mock_session.fetchall.return_value = [] # For search

        self.mock_session_local = MagicMock()
        self.mock_session_local.return_value.__enter__.return_value = self.mock_session
        self.mock_session_local.return_value.__exit__.return_value = None
        mock_sessionmaker.return_value = self.mock_session_local

        self.mock_embedding_service = MagicMock(spec=EmbeddingService)
        self.mock_embedding_service.encode_texts.return_value = MagicMock(tolist=lambda: [[0.1]*384, [0.2]*384]) # Added default return for encode_texts
        self.mock_embedding_service.encode_query.return_value = MagicMock(tolist=lambda: [0.5]*384) # Added default return for encode_query
        self.mock_embedding_service.get_embedding_dimension.return_value = 384

        self.vector_store = SupabaseVectorStore(embedding_service=self.mock_embedding_service)

    def test_add_documents(self):
        chunks = [
            DocumentChunk(text="test chunk 1", doc_id="doc1", chunk_id="chunk1", metadata={'source': 'test'}),
            DocumentChunk(text="test chunk 2", doc_id="doc1", chunk_id="chunk2", metadata={'source': 'test'}),
        ]
        self.mock_embedding_service.encode_texts.return_value = MagicMock(tolist=lambda: [[0.1]*384, [0.2]*384])

        self.vector_store.add_documents(chunks)

        self.mock_embedding_service.encode_texts.assert_called_once_with([c.text for c in chunks])
        self.assertTrue(self.mock_session.execute.called)
        self.mock_session.commit.assert_called_once()

    def test_search(self):
        query = "test query"
        top_k = 2
        score_threshold = 0.5

        mock_result_row1 = MagicMock()
        mock_result_row1.content = "result content 1"
        mock_result_row1.metadata = {'doc_id': 'doc_a', 'chunk_id': 'chunk_a'}
        mock_result_row1.similarity_score = 0.9

        mock_result_row2 = MagicMock()
        mock_result_row2.content = "result content 2"
        mock_result_row2.metadata = {'doc_id': 'doc_b', 'chunk_id': 'chunk_b'}
        mock_result_row2.similarity_score = 0.6

        self.mock_session.execute.return_value.fetchall.return_value = [mock_result_row1, mock_result_row2]
        self.mock_embedding_service.encode_query.return_value = MagicMock(tolist=lambda: [0.5]*384)

        results = self.vector_store.search(query, top_k, score_threshold)

        self.mock_embedding_service.encode_query.assert_called_once_with(query)
        self.assertTrue(self.mock_session.execute.called)
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]['text'], "result content 1")
        self.assertEqual(results[1]['text'], "result content 2")
        self.assertEqual(results[0]['score'], 0.9)

    def test_get_stats(self):
        self.mock_session.execute.return_value.scalar.return_value = 10

        stats = self.vector_store.get_stats()

        self.assertTrue(self.mock_session.execute.called)
        self.assertEqual(stats['total_chunks'], 10)
        self.assertEqual(stats['embedding_dimension'], 384)

if __name__ == '__main__':
    unittest.main()
