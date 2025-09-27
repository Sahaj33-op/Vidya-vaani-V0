from fastapi.testclient import TestClient
from app.main import app
from app.dependencies import get_llm_service
from app.services.llm_service import MockLLMService, GeminiLLMService
from app.core.config import settings

client = TestClient(app)

def test_chat_text():
    response = client.post("/api/v1/chat/text", json={"message": "Hello"})
    assert response.status_code == 200
    assert response.json() == {"reply": "Mock response to: Hello"} if settings.DEMO_MODE else {"reply": "Gemini (using key: key_here) response to: Hello"}

def test_chat_voice():
    # Create a dummy audio file for testing
    audio_data = b"dummy_audio_data"
    response = client.post(
        "/api/v1/chat/voice",
        files={"audio_file": ("audio.wav", audio_data, "audio/wav")},
    )
    assert response.status_code == 200
    expected_transcription = "Mock transcription of audio data"
    expected_reply = f"Mock response to: {expected_transcription}" if settings.DEMO_MODE else f"Gemini (using key: {settings.GEMINI_API_KEY[-4:]}) response to: {expected_transcription}"
    assert response.json() == {"reply": expected_reply}

def test_llm_service_dependency_mock_mode():
    settings.DEMO_MODE = True
    llm_service = get_llm_service()
    assert isinstance(llm_service, MockLLMService)
    settings.DEMO_MODE = False # Reset for other tests

def test_llm_service_dependency_production_mode():
    settings.DEMO_MODE = False
    llm_service = get_llm_service()
    assert isinstance(llm_service, GeminiLLMService)
