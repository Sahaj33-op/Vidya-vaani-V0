"""
Vector store implementation using FAISS for document retrieval
Supports both local FAISS and Chroma vector databases
"""

import os
import json
import pickle
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
import faiss
from pathlib import Path
import logging

from .embeddings import EmbeddingService
from .document_processor import DocumentChunk

logger = logging.getLogger(__name__)

class FAISSVectorStore:
    """FAISS-based vector store for document retrieval"""
    
    def __init__(self, embedding_service: EmbeddingService, index_path: str = "data/faiss_index"):
        """
        Initialize FAISS vector store
        
        Args:
            embedding_service: Service for generating embeddings
            index_path: Path to store FAISS index
        """
        self.embedding_service = embedding_service
        self.index_path = Path(index_path)
        self.index_path.mkdir(parents=True, exist_ok=True)
        
        self.index = None
        self.chunks = []
        self.chunk_metadata = {}
        
        # Try to load existing index
        self._load_index()
    
    def add_documents(self, chunks: List[DocumentChunk]) -> None:
        """
        Add document chunks to the vector store
        
        Args:
            chunks: List of DocumentChunk objects to add
        """
        if not chunks:
            logger.warning("No chunks provided to add")
            return
        
        logger.info(f"Adding {len(chunks)} chunks to vector store")
        
        # Extract texts for embedding
        texts = [chunk.text for chunk in chunks]
        
        # Generate embeddings
        embeddings = self.embedding_service.encode_texts(texts)
        
        # Initialize index if it doesn't exist
        if self.index is None:
            dimension = embeddings.shape[1]
            self.index = faiss.IndexFlatIP(dimension)  # Inner product for cosine similarity
            logger.info(f"Created new FAISS index with dimension {dimension}")
        
        # Normalize embeddings for cosine similarity
        faiss.normalize_L2(embeddings)
        
        # Add to index
        self.index.add(embeddings)
        
        # Store chunk metadata
        start_idx = len(self.chunks)
        for i, chunk in enumerate(chunks):
            chunk_idx = start_idx + i
            self.chunks.append(chunk)
            self.chunk_metadata[chunk_idx] = chunk.to_dict()
        
        logger.info(f"Added {len(chunks)} chunks. Total chunks: {len(self.chunks)}")
        
        # Save index
        self._save_index()
    
    def search(self, query: str, top_k: int = 5, score_threshold: float = 0.0) -> List[Dict[str, Any]]:
        """
        Search for similar documents
        
        Args:
            query: Search query
            top_k: Number of results to return
            score_threshold: Minimum similarity score
            
        Returns:
            List of search results with chunks and scores
        """
        if self.index is None or len(self.chunks) == 0:
            logger.warning("No documents in vector store")
            return []
        
        # Generate query embedding
        query_embedding = self.embedding_service.encode_query(query)
        query_embedding = query_embedding.reshape(1, -1)
        
        # Normalize for cosine similarity
        faiss.normalize_L2(query_embedding)
        
        # Search
        scores, indices = self.index.search(query_embedding, min(top_k, len(self.chunks)))
        
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx >= 0 and score >= score_threshold:  # Valid index and above threshold
                chunk = self.chunks[idx]
                result = {
                    'chunk': chunk,
                    'score': float(score),
                    'text': chunk.text,
                    'doc_id': chunk.doc_id,
                    'chunk_id': chunk.chunk_id,
                    'metadata': chunk.metadata
                }
                results.append(result)
        
        logger.info(f"Found {len(results)} results for query: {query[:50]}...")
        return results
    
    def get_stats(self) -> Dict[str, Any]:
        """Get vector store statistics"""
        return {
            'total_chunks': len(self.chunks),
            'index_size': self.index.ntotal if self.index else 0,
            'embedding_dimension': self.embedding_service.get_embedding_dimension(),
            'unique_documents': len(set(chunk.doc_id for chunk in self.chunks))
        }
    
    def _save_index(self) -> None:
        """Save FAISS index and metadata to disk"""
        try:
            if self.index is not None:
                # Save FAISS index
                index_file = self.index_path / "faiss.index"
                faiss.write_index(self.index, str(index_file))
                
                # Save chunks and metadata
                chunks_file = self.index_path / "chunks.pkl"
                with open(chunks_file, 'wb') as f:
                    pickle.dump(self.chunks, f)
                
                metadata_file = self.index_path / "metadata.json"
                with open(metadata_file, 'w') as f:
                    json.dump(self.chunk_metadata, f, indent=2)
                
                logger.info(f"Saved index to {self.index_path}")
        except Exception as e:
            logger.error(f"Failed to save index: {e}")
    
    def _load_index(self) -> None:
        """Load FAISS index and metadata from disk"""
        try:
            index_file = self.index_path / "faiss.index"
            chunks_file = self.index_path / "chunks.pkl"
            metadata_file = self.index_path / "metadata.json"
            
            if all(f.exists() for f in [index_file, chunks_file, metadata_file]):
                # Load FAISS index
                self.index = faiss.read_index(str(index_file))
                
                # Load chunks
                with open(chunks_file, 'rb') as f:
                    self.chunks = pickle.load(f)
                
                # Load metadata
                with open(metadata_file, 'r') as f:
                    self.chunk_metadata = json.load(f)
                    # Convert string keys back to int
                    self.chunk_metadata = {int(k): v for k, v in self.chunk_metadata.items()}
                
                logger.info(f"Loaded index from {self.index_path} with {len(self.chunks)} chunks")
            else:
                logger.info("No existing index found, will create new one")
        except Exception as e:
            logger.error(f"Failed to load index: {e}")
            self.index = None
            self.chunks = []
            self.chunk_metadata = {}
