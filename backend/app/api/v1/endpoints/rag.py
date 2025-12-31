"""
RAG (Retrieval-Augmented Generation) API endpoints
Provides document search and retrieval functionality
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from app.services.rag_service import RAGService
from app.dependencies import get_rag_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class SearchRequest(BaseModel):
    """Request model for document search"""
    query: str = Field(..., min_length=1, max_length=1000, description="Search query")
    language: str = Field(default="en", description="Query language code")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of results to return")
    score_threshold: float = Field(default=0.3, ge=0.0, le=1.0, description="Minimum similarity score")


class SearchResult(BaseModel):
    """Individual search result"""
    text: str
    doc_id: str
    chunk_id: str
    score: float
    metadata: Dict[str, Any] = {}


class SearchResponse(BaseModel):
    """Response model for document search"""
    query: str
    results: List[SearchResult]
    total_results: int
    sources: List[str]


class AddDocumentsRequest(BaseModel):
    """Request model for adding documents"""
    documents: List[Dict[str, Any]] = Field(..., description="List of documents to add")


class AddDocumentsResponse(BaseModel):
    """Response model for adding documents"""
    message: str
    documents_added: int


class RAGStatsResponse(BaseModel):
    """Response model for RAG system statistics"""
    total_chunks: int
    index_size: int
    embedding_dimension: int
    unique_documents: int = 0
    mode: str = "unknown"


@router.post("/search", response_model=SearchResponse)
async def search_documents(
    request: SearchRequest,
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Search for relevant documents using semantic similarity.

    Returns top-k most relevant document chunks for the given query.
    """
    try:
        logger.info(f"Searching for: {request.query[:50]}...")

        results = rag_service.search(
            query=request.query,
            top_k=request.top_k,
            score_threshold=request.score_threshold
        )

        # Format results
        formatted_results = [
            SearchResult(
                text=r['text'],
                doc_id=r['doc_id'],
                chunk_id=r['chunk_id'],
                score=r['score'],
                metadata=r.get('metadata', {})
            )
            for r in results
        ]

        # Extract unique sources
        sources = list(set(r['doc_id'] for r in results))

        return SearchResponse(
            query=request.query,
            results=formatted_results,
            total_results=len(formatted_results),
            sources=sources
        )

    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/add", response_model=AddDocumentsResponse)
async def add_documents(
    request: AddDocumentsRequest,
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Add documents to the RAG index.

    Documents should have 'content' or 'text', 'doc_id', and optional 'metadata' fields.
    """
    try:
        logger.info(f"Adding {len(request.documents)} documents to index")

        rag_service.add_documents(request.documents)

        return AddDocumentsResponse(
            message="Documents added successfully",
            documents_added=len(request.documents)
        )

    except Exception as e:
        logger.error(f"Add documents error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add documents: {str(e)}")


@router.get("/stats", response_model=RAGStatsResponse)
async def get_rag_stats(
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Get RAG system statistics.

    Returns information about the indexed documents and system status.
    """
    try:
        stats = rag_service.get_stats()

        return RAGStatsResponse(
            total_chunks=stats.get('total_chunks', 0),
            index_size=stats.get('index_size', 0),
            embedding_dimension=stats.get('embedding_dimension', 384),
            unique_documents=stats.get('unique_documents', 0),
            mode=stats.get('mode', 'unknown')
        )

    except Exception as e:
        logger.error(f"Get stats error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


@router.post("/query")
async def query_with_context(
    request: SearchRequest,
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Query the RAG system and return context for LLM generation.

    This endpoint is optimized for use with the chat endpoint.
    Returns context chunks suitable for LLM prompt augmentation.
    """
    try:
        results = rag_service.search(
            query=request.query,
            top_k=request.top_k,
            score_threshold=request.score_threshold
        )

        # Format context for LLM
        context_chunks = [r['text'] for r in results]
        sources = list(set(r['doc_id'] for r in results))

        # Calculate average confidence
        avg_score = sum(r['score'] for r in results) / len(results) if results else 0.0

        return {
            "query": request.query,
            "context": context_chunks,
            "sources": sources,
            "confidence": avg_score,
            "has_context": len(results) > 0
        }

    except Exception as e:
        logger.error(f"Query error: {e}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
