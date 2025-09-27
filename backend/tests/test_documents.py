from fastapi.testclient import TestClient
from app.main import app
from app.dependencies import get_storage_service, get_ocr_service
from app.services.storage_service import LocalStorageService, S3StorageService
from app.services.ocr_service import MockOCRService, RealOCRService
from app.core.config import settings

client = TestClient(app)

def test_upload_documents():
    # Create a dummy file for testing
    file_content = b"dummy document content"
    response = client.post(
        "/api/v1/documents/upload",
        files={"file": ("document.txt", file_content, "text/plain")},
    )
    assert response.status_code == 200
    expected_message = "Document uploaded and processed successfully"
    expected_uploaded_file = "document.txt"
    assert response.json() == {
        "message": expected_message,
        "uploaded_files": [f"File {expected_uploaded_file} saved locally"] if settings.DEMO_MODE else [f"File {expected_uploaded_file} uploaded to S3 bucket {settings.S3_BUCKET_NAME}"],
    }

def test_storage_service_dependency_mock_mode():
    settings.DEMO_MODE = True
    storage_service = get_storage_service()
    assert isinstance(storage_service, LocalStorageService)
    settings.DEMO_MODE = False # Reset for other tests

def test_storage_service_dependency_production_mode():
    settings.DEMO_MODE = False
    storage_service = get_storage_service()
    assert isinstance(storage_service, S3StorageService)

def test_ocr_service_dependency_mock_mode():
    settings.DEMO_MODE = True
    ocr_service = get_ocr_service()
    assert isinstance(ocr_service, MockOCRService)
    settings.DEMO_MODE = False # Reset for other tests

def test_ocr_service_dependency_production_mode():
    settings.DEMO_MODE = False
    ocr_service = get_ocr_service()
    assert isinstance(ocr_service, RealOCRService)
