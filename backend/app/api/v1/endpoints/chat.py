import hashlib
import httpx
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from app.api.models.chat import ChatRequest, ChatResponse, RetrievedDocument
from app.services.llm_service import LLMService
from app.services.stt_service import STTService
from app.dependencies import get_llm_service, get_stt_service, get_rasa_service
from app.core.config import settings
from typing import List, Dict, Any, Optional
import redis
import json

router = APIRouter()

# Redis connection for caching
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    password=settings.REDIS_PASSWORD,
    db=settings.REDIS_DB,
    decode_responses=True
)

async def detect_language(text: str) -> Dict[str, Any]:
    """Detect language from text."""
    # Simple detection logic - in production, use a proper language detection service
    hindi_keywords = ['नमस्ते', 'फीस', 'प्रवेश', 'समय']
    marathi_keywords = ['नमस्कार', 'फी', 'प्रवेश', 'वेळ']
    
    lower_text = text.lower()
    
    if any(keyword in lower_text for keyword in hindi_keywords):
        return {
            "detected_language": "hi",
            "processed_text": text,
            "confidence": 0.8,
            "translation_needed": True
        }
    if any(keyword in lower_text for keyword in marathi_keywords):
        return {
            "detected_language": "mr",
            "processed_text": text,
            "translation_needed": True,
            "confidence": 0.8
        }
    
    # Default to English
    return {
        "detected_language": "en",
        "processed_text": text,
        "confidence": 1.0,
        "translation_needed": False
    }

async def translate_text(text: str, source_lang: str, target_lang: str) -> Dict[str, Any]:
    """Translate text between languages."""
    if source_lang == target_lang:
        return {"translated_text": text, "confidence": 1.0}
    
    # In production, integrate with a translation service
    # This is a placeholder implementation
    return {"translated_text": f"Translated to {target_lang}: {text}", "confidence": 0.9}

async def get_nlu_intent_and_entities(text: str, language: str) -> Dict[str, Any]:
    """Get intent and entities from Rasa NLU."""
    RASA_API_URL = settings.RASA_API_URL or "http://localhost:5005"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{RASA_API_URL}/model/parse",
                json={"text": text, "language": language},
                timeout=10.0
            )
            
            if response.status_code != 200:
                return {"intent": "general_query", "entities": []}
            
            data = response.json()
            
            # Extract the most confident intent
            best_intent = "general_query"
            max_confidence = 0
            
            if data.get("intent") and data["intent"].get("name"):
                best_intent = data["intent"]["name"]
                max_confidence = data["intent"]["confidence"]
            
            # If confidence is too low, fallback to general query
            if max_confidence < 0.5:
                best_intent = "general_query"
                
            return {
                "intent": best_intent,
                "entities": data.get("entities", [])
            }
    except Exception as e:
        print(f"Error calling Rasa NLU: {e}")
        return {"intent": "general_query", "entities": []}

async def retrieve_context_documents(query: str, language: str = "en", top_k: int = 5) -> Dict[str, Any]:
    """Retrieve context documents using RAG."""
    try:
        # In a real implementation, this would call your vector store directly
        # For now, we'll use the existing RAG endpoint via HTTP
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.BACKEND_URL}/api/v1/documents/search",
                json={"query": query, "language": language, "top_k": top_k},
                timeout=10.0
            )
            
            if response.status_code != 200:
                return {"retrieved_chunks": [], "sources": []}
            
            data = response.json()
            return {
                "retrieved_chunks": data.get("chunks", []),
                "sources": data.get("sources", [])
            }
    except Exception as e:
        print(f"Error retrieving context documents: {e}")
        return {"retrieved_chunks": [], "sources": []}

async def generate_static_response(intent: str, lang: str) -> ChatResponse:
    """Generate static responses for specific intents."""
    reply = ""
    action = intent
    
    if intent == 'request_human_handoff':
        reply = "I've escalated your query to a human assistant. Your request ID is: REQ-1234. A staff member will join this chat shortly."
        action = "handoff"
    elif intent == 'out_of_scope':
        reply = "I can only help with college-related topics like admissions, fees, and timetables. Please ask something within my scope."
        action = "out_of_scope"
    else:
        # Default fallback for unhandled intents
        reply = "I'm sorry, I didn't understand that. Could you please rephrase?"
        action = "general_fallback"
    
    # Basic translation simulation for static responses if not English
    if lang != 'en':
        translation_result = await translate_text(reply, 'en', lang)
        if translation_result["confidence"] > 0.5:
            reply = translation_result["translated_text"]
    
    return ChatResponse(
        reply=reply,
        confidence=1.0,  # High confidence for static, predefined responses
        source_ids=[],
        action=action,
        translated=lang != 'en',
        original_language=lang
    )

@router.post("/text", response_model=ChatResponse)
async def chat_text(request: ChatRequest, llm_service: LLMService = Depends(get_llm_service)):
    """Process text chat requests with full orchestration."""
    try:
        # Check cache first
        cache_key = f"chat:{hashlib.sha256(request.message.encode()).hexdigest()}"
        cached_response = redis_client.get(cache_key)
        if cached_response:
            return ChatResponse(**json.loads(cached_response))
        
        # Language detection and translation to English
        language_info = await detect_language(request.message)
        english_text = language_info["processed_text"]
        original_language = language_info["detected_language"]
        translated_to_english = False
        
        if language_info["translation_needed"] and original_language != 'en':
            translation_result = await translate_text(english_text, original_language, 'en')
            if translation_result["confidence"] > 0.5:
                english_text = translation_result["translated_text"]
                translated_to_english = True
        
        # Get intent and entities from Rasa NLU
        nlu_result = await get_nlu_intent_and_entities(english_text, 'en')
        intent = nlu_result["intent"]
        entities = nlu_result["entities"]
        
        response: ChatResponse
        
        # Handle specific intents that don't require LLM/RAG
        if intent in ['out_of_scope', 'request_human_handoff']:
            response = await generate_static_response(intent, original_language)
        else:
            # RAG Retrieval
            rag_result = await retrieve_context_documents(english_text, 'en', 5)
            context = rag_result["retrieved_chunks"]
            source_ids = rag_result["sources"]
            
            # Generate response using LLM with RAG context
            llm_response = llm_service.generate_response(english_text, context)
            
            response = ChatResponse(
                reply=llm_response,
                source_ids=source_ids,
                action="answer:llm",
                translated=translated_to_english,
                original_language=original_language,
                confidence=0.8  # Placeholder confidence
            )
        
        # Translate response back to original language if needed
        if translated_to_english and response.reply:
            translation_result = await translate_text(response.reply, 'en', original_language)
            if translation_result["confidence"] > 0.5:
                response.reply = translation_result["translated_text"]
                response.translated = True
        
        # Cache the response
        redis_client.setex(cache_key, 900, json.dumps(response.dict()))
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat request: {str(e)}")

@router.post("/voice", response_model=ChatResponse)
async def chat_voice(audio_file: UploadFile = File(...), stt_service: STTService = Depends(get_stt_service), llm_service: LLMService = Depends(get_llm_service)):
    """Process voice chat requests."""
    try:
        audio_data = await audio_file.read()
        transcribed_text = stt_service.transcribe_audio(audio_data)
        
        # Create a ChatRequest and process it through the text endpoint logic
        request = ChatRequest(message=transcribed_text)
        return await chat_text(request, llm_service)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing voice request: {str(e)}")
