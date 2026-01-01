import logging
from pathlib import Path
from typing import Set

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.api.models.documents import DocumentUploadRequest, DocumentUploadResponse
from app.dependencies import get_ocr_service, get_rag_service, get_storage_service
from app.services.ocr_service import OCRService
from app.services.rag_service import RAGService
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_EXTENSIONS: Set[str] = {".pdf", ".docx", ".doc", ".txt", ".md"}
ALLOWED_MIME_TYPES: Set[str] = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "text/markdown",
}
MAX_FILE_SIZE = 10 * 1024 * 1024


class DocumentUploadJSONRequest(BaseModel):
    """JSON-based document upload for easier frontend integration"""

    filename: str
    content: str
    metadata: dict = {}


def validate_file(file: UploadFile) -> None:
    """Validate uploaded file for security and size constraints"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file_ext}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        logger.warning(f"Suspicious file upload attempt: {file.content_type}")
        raise HTTPException(
            status_code=400, detail=f"Invalid file content type: {file.content_type}"
        )


@router.get("/list")
async def list_documents(
    storage_service: StorageService = Depends(get_storage_service),
):
    """
    List all indexed documents with metadata
    """
    try:
        # Get list of files from storage
        files = storage_service.list_files()

        documents = []
        for filename in files:
            try:
                # Get file metadata if available
                file_path = storage_service.storage_path / filename
                if file_path.exists():
                    stat = file_path.stat()
                    documents.append(
                        {
                            "id": f"doc_{filename}",
                            "title": filename.replace(".txt", "").replace("_", " "),
                            "filename": filename,
                            "size": stat.st_size,
                            "uploadDate": stat.st_mtime,
                            "status": "indexed",
                            "chunks": 0,  # Could be enhanced to track chunk count
                        }
                    )
            except Exception as e:
                logger.error(f"Error reading file {filename}: {e}")
                continue

        return {
            "success": True,
            "documents": documents,
            "total": len(documents),
        }
    except Exception as e:
        logger.error(f"Failed to list documents: {e}", exc_info=True)
        return {
            "success": False,
            "documents": [],
            "total": 0,
        }


@router.post("/upload")
async def upload_document_json(
    request: DocumentUploadJSONRequest,
    rag_service: RAGService = Depends(get_rag_service),
):
    """
    Upload and index a document (JSON format for easy frontend integration)
    """
    try:
        # Generate document ID
        doc_id = f"doc_{request.filename.replace(' ', '_')}_{len(request.content)}"

        # Index the document in RAG
        documents = [
            {
                "doc_id": doc_id,
                "content": request.content,
                "metadata": {"filename": request.filename, **request.metadata},
            }
        ]

        rag_service.add_documents(documents)

        # Get stats to return chunk count
        stats = rag_service.get_stats()

        logger.info(
            f"Successfully indexed document: {request.filename} ({len(request.content)} chars)"
        )

        return {
            "success": True,
            "message": "Document uploaded and indexed successfully",
            "doc_id": doc_id,
            "chunks_created": stats.get("total_chunks", 0),
            "filename": request.filename,
        }

    except Exception as e:
        logger.error(f"Failed to upload document: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to upload document: {str(e)}"
        )


@router.post("/upload-file", response_model=DocumentUploadResponse)
async def upload_documents(
    file: UploadFile = File(...),
    storage_service: StorageService = Depends(get_storage_service),
    ocr_service: OCRService = Depends(get_ocr_service),
    rag_service: RAGService = Depends(get_rag_service),
):
    validate_file(file)

    file_content = await file.read()

    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / 1024 / 1024}MB",
        )

    if len(file_content) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    try:
        uploaded_file_name = storage_service.upload_file(file.filename, file_content)

        if file.content_type and "image" in file.content_type:
            ocr_text = ocr_service.extract_text_from_image(file_content)
            logger.info(f"OCR extracted {len(ocr_text)} characters from image")

        logger.info(f"Successfully uploaded document: {file.filename}")

        return {
            "message": "Document uploaded and processed successfully",
            "uploaded_files": [uploaded_file_name],
        }
    except Exception as e:
        logger.error(f"Failed to upload document {file.filename}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to upload document: {str(e)}"
        )
