from fastapi import APIRouter, Depends, UploadFile, File
from app.api.models.documents import DocumentUploadRequest, DocumentUploadResponse
from app.services.storage_service import StorageService
from app.services.ocr_service import OCRService
from app.dependencies import get_storage_service, get_ocr_service

router = APIRouter()

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_documents(file: UploadFile = File(...), storage_service: StorageService = Depends(get_storage_service), ocr_service: OCRService = Depends(get_ocr_service)):
    file_content = await file.read()
    uploaded_file_name = storage_service.upload_file(file.filename, file_content)

    # Optional: Process with OCR if it's an image (example logic)
    if file.content_type and "image" in file.content_type:
        ocr_text = ocr_service.extract_text_from_image(file_content)
        print(f"OCR extracted text: {ocr_text}") # For demonstration

    return {
        "message": "Document uploaded and processed successfully",
        "uploaded_files": [uploaded_file_name],
    }
