import logging
from pathlib import Path
from typing import Set

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

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


@router.post("/upload", response_model=DocumentUploadResponse)
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
