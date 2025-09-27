from fastapi import APIRouter, Depends, UploadFile, File
from app.api.models.chat import ChatRequest, ChatResponse
from app.services.llm_service import LLMService
from app.services.stt_service import STTService
from app.dependencies import get_llm_service, get_stt_service

router = APIRouter()

@router.post("/text", response_model=ChatResponse)
async def chat_text(request: ChatRequest, llm_service: LLMService = Depends(get_llm_service)):
    reply = llm_service.generate_response(request.message)
    return {"reply": reply}

@router.post("/voice", response_model=ChatResponse)
async def chat_voice(audio_file: UploadFile = File(...), stt_service: STTService = Depends(get_stt_service), llm_service: LLMService = Depends(get_llm_service)):
    audio_data = await audio_file.read()
    transcribed_text = stt_service.transcribe_audio(audio_data)
    reply = llm_service.generate_response(transcribed_text)
    return {"reply": reply}
