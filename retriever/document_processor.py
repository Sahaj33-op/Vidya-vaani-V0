"""
Document processing and chunking for RAG system
Handles PDF parsing, text chunking, and metadata extraction
"""

import os
import re
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class DocumentChunk:
    """Represents a chunk of document text with metadata"""
    
    def __init__(self, text: str, doc_id: str, chunk_id: str, 
                 page_num: Optional[int] = None, metadata: Optional[Dict] = None):
        self.text = text
        self.doc_id = doc_id
        self.chunk_id = chunk_id
        self.page_num = page_num
        self.metadata = metadata or {}
        self.text_hash = self._generate_hash()
    
    def _generate_hash(self) -> str:
        """Generate hash for chunk deduplication"""
        return hashlib.md5(self.text.encode()).hexdigest()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert chunk to dictionary"""
        return {
            'text': self.text,
            'doc_id': self.doc_id,
            'chunk_id': self.chunk_id,
            'page_num': self.page_num,
            'metadata': self.metadata,
            'text_hash': self.text_hash
        }

class DocumentProcessor:
    """Processes documents for RAG indexing"""
    
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        """
        Initialize document processor
        
        Args:
            chunk_size: Maximum tokens per chunk
            chunk_overlap: Overlap between chunks in tokens
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    def process_text_file(self, file_path: str, doc_id: Optional[str] = None) -> List[DocumentChunk]:
        """
        Process a text file into chunks
        
        Args:
            file_path: Path to text file
            doc_id: Document identifier
            
        Returns:
            List of DocumentChunk objects
        """
        if not doc_id:
            doc_id = Path(file_path).stem
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            logger.info(f"Processing text file: {file_path}")
            chunks = self._chunk_text(content, doc_id)
            logger.info(f"Created {len(chunks)} chunks from {file_path}")
            
            return chunks
        except Exception as e:
            logger.error(f"Failed to process text file {file_path}: {e}")
            raise
    
    def process_faq_data(self, faq_data: List[Dict[str, str]]) -> List[DocumentChunk]:
        """
        Process FAQ data into chunks
        
        Args:
            faq_data: List of FAQ dictionaries with 'question' and 'answer' keys
            
        Returns:
            List of DocumentChunk objects
        """
        chunks = []
        
        for i, faq in enumerate(faq_data):
            question = faq.get('question', '')
            answer = faq.get('answer', '')
            category = faq.get('category', 'general')
            
            # Combine question and answer
            text = f"Q: {question}\nA: {answer}"
            
            chunk = DocumentChunk(
                text=text,
                doc_id=f"faq_{category}",
                chunk_id=f"faq_{category}_{i}",
                metadata={
                    'type': 'faq',
                    'category': category,
                    'question': question,
                    'answer': answer
                }
            )
            chunks.append(chunk)
        
        logger.info(f"Created {len(chunks)} FAQ chunks")
        return chunks
    
    def _chunk_text(self, text: str, doc_id: str) -> List[DocumentChunk]:
        """
        Split text into overlapping chunks
        
        Args:
            text: Text to chunk
            doc_id: Document identifier
            
        Returns:
            List of DocumentChunk objects
        """
        # Clean and normalize text
        text = self._clean_text(text)
        
        # Simple sentence-based chunking
        sentences = self._split_into_sentences(text)
        chunks = []
        
        current_chunk = []
        current_length = 0
        chunk_id = 0
        
        for sentence in sentences:
            sentence_length = len(sentence.split())
            
            # If adding this sentence would exceed chunk size, create a chunk
            if current_length + sentence_length > self.chunk_size and current_chunk:
                chunk_text = ' '.join(current_chunk)
                chunk = DocumentChunk(
                    text=chunk_text,
                    doc_id=doc_id,
                    chunk_id=f"{doc_id}_chunk_{chunk_id}",
                    metadata={'chunk_index': chunk_id}
                )
                chunks.append(chunk)
                
                # Start new chunk with overlap
                overlap_sentences = current_chunk[-self.chunk_overlap//10:] if len(current_chunk) > self.chunk_overlap//10 else current_chunk
                current_chunk = overlap_sentences + [sentence]
                current_length = sum(len(s.split()) for s in current_chunk)
                chunk_id += 1
            else:
                current_chunk.append(sentence)
                current_length += sentence_length
        
        # Add final chunk if there's remaining content
        if current_chunk:
            chunk_text = ' '.join(current_chunk)
            chunk = DocumentChunk(
                text=chunk_text,
                doc_id=doc_id,
                chunk_id=f"{doc_id}_chunk_{chunk_id}",
                metadata={'chunk_index': chunk_id}
            )
            chunks.append(chunk)
        
        return chunks
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters but keep punctuation
        text = re.sub(r'[^\w\s\.\,\?\!\;\:\-$$$$]', ' ', text)
        return text.strip()
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences"""
        # Simple sentence splitting
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        return sentences
