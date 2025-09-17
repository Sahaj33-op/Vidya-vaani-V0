"""
Script to add vectors to FAISS index
Used by the indexing worker to add document chunks to the vector store
"""

import sys
import json
import numpy as np
import logging
from pathlib import Path

from .vector_store import FAISSVectorStore
from .embeddings import EmbeddingService
from .document_processor import DocumentChunk

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_vectors_to_index(data_file):
    """
    Add vectors to FAISS index from a JSON file
    
    Args:
        data_file: Path to JSON file with docId, chunkIds, and embeddings
    """
    try:
        # Load data
        with open(data_file, 'r') as f:
            data = json.load(f)
        
        doc_id = data['docId']
        chunk_ids = data['chunkIds']
        embeddings = np.array(data['embeddings'], dtype=np.float32)
        
        logger.info(f"Adding {len(chunk_ids)} vectors for document {doc_id}")
        
        # Initialize services
        embedding_service = EmbeddingService()
        vector_store = FAISSVectorStore(embedding_service)
        
        # Create document chunks with IDs
        chunks = []
        for i, (chunk_id, embedding) in enumerate(zip(chunk_ids, embeddings)):
            # We don't have the actual text here, but the worker script has stored
            # the metadata separately, so we just need the IDs for FAISS
            chunk = DocumentChunk(
                text=f"Chunk {i} of document {doc_id}",  # Placeholder
                doc_id=doc_id,
                chunk_id=str(i),
                metadata={"chunk_id": chunk_id}
            )
            chunks.append(chunk)
        
        # Add to index
        vector_store.add_documents(chunks)
        
        logger.info(f"Successfully added vectors for document {doc_id}")
        return True
    except Exception as e:
        logger.error(f"Error adding vectors to index: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python -m retriever.add_to_index <data_file>")
        sys.exit(1)
    
    data_file = sys.argv[1]
    success = add_vectors_to_index(data_file)
    sys.exit(0 if success else 1)