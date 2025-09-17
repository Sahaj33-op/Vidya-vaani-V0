#!/usr/bin/env python3
"""
Script to index documents into the RAG system
Usage: python scripts/index_documents.py --input docs/ --model paraphrase-multilingual-MiniLM-L12-v2
"""

import os
import sys
import argparse
import logging
from pathlib import Path

# Add the retriever module to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from retriever.rag_pipeline import RAGPipeline
from retriever.document_processor import DocumentProcessor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    parser = argparse.ArgumentParser(description='Index documents for RAG system')
    parser.add_argument('--input', type=str, default='docs/', help='Input directory with documents')
    parser.add_argument('--model', type=str, default='paraphrase-multilingual-MiniLM-L12-v2', 
                       help='SentenceTransformer model name')
    parser.add_argument('--chunk-size', type=int, default=500, help='Chunk size in tokens')
    parser.add_argument('--chunk-overlap', type=int, default=50, help='Chunk overlap in tokens')
    parser.add_argument('--index-path', type=str, default='data/faiss_index', help='Index storage path')
    
    args = parser.parse_args()
    
    logger.info(f"Initializing RAG pipeline with model: {args.model}")
    
    # Initialize RAG pipeline
    rag_pipeline = RAGPipeline(
        embedding_model=args.model,
        index_path=args.index_path,
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap
    )
    
    # Process documents from input directory
    input_path = Path(args.input)
    if not input_path.exists():
        logger.error(f"Input directory does not exist: {input_path}")
        return
    
    documents = []
    doc_processor = DocumentProcessor(args.chunk_size, args.chunk_overlap)
    
    # Process text files
    for file_path in input_path.glob('*.txt'):
        logger.info(f"Processing: {file_path}")
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            documents.append({
                'doc_id': file_path.stem,
                'content': content,
                'metadata': {
                    'filename': file_path.name,
                    'file_type': 'text'
                }
            })
        except Exception as e:
            logger.error(f"Failed to process {file_path}: {e}")
    
    if documents:
        logger.info(f"Indexing {len(documents)} documents...")
        rag_pipeline.index_documents(documents)
        
        # Print statistics
        stats = rag_pipeline.get_system_stats()
        logger.info(f"Indexing complete. Stats: {stats}")
    else:
        logger.warning("No documents found to index")

if __name__ == '__main__':
    main()
