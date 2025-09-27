# Backend Migration TODO

This document outlines the remaining tasks for migrating the Flask backend to FastAPI and implementing the modular, adapter-based architecture.

## 1. Environment Configuration

*   [x] **Implement `.env` file loading:**
    *   [x] Modify `backend/app/core/config.py` to load environment variables from a `.env` file using `python-dotenv`.
    *   [x] Define all necessary environment variables (e.g., `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `S3_BUCKET_NAME`, `DEMO_MODE`).

## 2. Service Implementations (Production Mode)

*   [x] **LLM Service:**
    *   [x] Implement `GeminiLLMService` in `backend/app/services/llm_service.py` to integrate with the actual Gemini API.
*   [x] **Storage Service:**
    *   [x] Implement `S3StorageService` in `backend/app/services/storage_service.py` to integrate with AWS S3.
*   [x] **Authentication Service:**
    *   [x] Implement `SupabaseAuthService` in `backend/app/core/security.py` to integrate with Supabase for JWT verification.
*   [x] **STT Service:**
    *   [x] Implement `RealSTTService` (or similar) in `backend/app/services/stt_service.py` for actual Speech-to-Text functionality (e.g., Google Cloud Speech-to-Text, OpenAI Whisper).
*   [x] **OCR Service:**
    *   [x] Implement `RealOCRService` (or similar) in `backend/app/services/ocr_service.py` for actual Optical Character Recognition (e.g., Google Cloud Vision AI, Tesseract).

## 3. Dependency Injection and Mode Switching

*   [x] **Implement Dependency Injection:**
    *   [x] Set up FastAPI's dependency injection system to provide instances of the service adapters to the API endpoints.
    *   [x] Create a mechanism to switch between `Mock` and `Real` service implementations based on a `DEMO_MODE` environment variable.

## 4. API Endpoint Logic

*   [x] **`POST /api/v1/chat/text`:**
    *   [x] Integrate with the `LLMService` to process text queries and return responses.
*   [x] **`POST /api/v1/chat/voice`:**
    *   [x] Integrate with the `STTService` to transcribe audio.
    *   [x] Integrate with the `LLMService` to process the transcribed text.
*   [x] **`POST /api/v1/documents/upload`:**
    *   [x] Integrate with the `StorageService` to handle document uploads.
    *   [x] (Optional) Integrate with `OCRService` if uploaded documents are images.
    *   [ ] (Optional) Integrate with a RAG pipeline for document ingestion.
*   [x] **`GET /api/v1/admin/stats`:**
    *   [x] Implement logic to gather and return relevant system statistics (e.g., number of documents, API usage).
*   [x] **Authentication Middleware:**
    *   [x] Implement FastAPI security dependencies to use the `AuthService` for protecting relevant endpoints.

## 5. Testing

*   [x] **Unit Tests:**
    *   [x] Write comprehensive unit tests for each service adapter (mock and real implementations).
    *   [x] Write unit tests for utility functions in `backend/app/core/`.
*   [x] **Integration Tests:**
    *   [x] Expand existing integration tests for API endpoints to cover more scenarios, including error handling and different service modes (demo/production).
    *   [x] Ensure tests can be run with `pytest`.

## 6. Documentation

*   [x] **API Documentation:**
    *   [x] Ensure all API endpoints have clear docstrings and Pydantic models are well-defined for automatic OpenAPI (Swagger UI) generation.
*   [ ] **Code Comments:**
    *   [ ] Add comments where necessary to explain complex logic or design decisions.

## 7. Deployment

*   [ ] **Docker Compose:**
    *   [ ] Update `docker-compose.yml` and `docker-compose.dev.yml` to include the new FastAPI backend service.
*   [ ] **Kubernetes (k8s):**
    *   [ ] Update Kubernetes configurations in `k8s/` to deploy the FastAPI backend.

## 8. Server Status

*   [x] **FastAPI Server Running:**
    *   [x] Server successfully starts with Uvicorn
    *   [x] Health endpoint (`/api/v1/admin/health`) responds correctly
    *   [x] Text chat endpoint (`/api/v1/chat/text`) responds correctly in demo mode
    *   [x] Authentication middleware protects admin endpoints
    *   [x] All tests pass successfully
