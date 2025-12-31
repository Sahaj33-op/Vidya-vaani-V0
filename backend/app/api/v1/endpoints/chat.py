import hashlib
import json
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.api.models.chat import ChatRequest, ChatResponse, RetrievedDocument
from app.core.config import settings
from app.dependencies import (
    get_llm_service,
    get_rag_service,
    get_rasa_service,
    get_stt_service,
    get_translation_service,
)
from app.services.llm_service import LLMService
from app.services.rag_service import RAGService
from app.services.stt_service import STTService
from app.services.translation_service import TranslationHelper, TranslationService

router = APIRouter()

# In-memory cache for demo mode
_demo_cache: Dict[str, str] = {}

# Redis connection for caching (only if enabled)
redis_client = None
if settings.REDIS_ENABLED:
    try:
        import redis

        redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD,
            db=settings.REDIS_DB,
            decode_responses=True,
        )
        redis_client.ping()
        logger.info("Redis connection established successfully")
    except Exception as e:
        logger.error(f"Redis connection failed, using in-memory cache: {e}")
        if not settings.DEMO_MODE:
            logger.warning(
                "Running production without Redis - this may impact performance"
            )
        redis_client = None


def cache_get(key: str) -> Optional[str]:
    """Get value from cache (Redis or in-memory)."""
    if redis_client:
        return redis_client.get(key)
    return _demo_cache.get(key)


def cache_set(key: str, value: str, ttl: int = 900) -> None:
    """Set value in cache (Redis or in-memory)."""
    if redis_client:
        redis_client.setex(key, ttl, value)
    else:
        _demo_cache[key] = value


async def detect_language(text: str) -> Dict[str, Any]:
    """Detect language from text."""
    # Simple detection logic - in production, use a proper language detection service
    hindi_keywords = ["नमस्ते", "फीस", "प्रवेश", "समय"]
    marathi_keywords = ["नमस्कार", "फी", "प्रवेश", "वेळ"]

    lower_text = text.lower()

    if any(keyword in lower_text for keyword in hindi_keywords):
        return {
            "detected_language": "hi",
            "processed_text": text,
            "confidence": 0.8,
            "translation_needed": True,
        }
    if any(keyword in lower_text for keyword in marathi_keywords):
        return {
            "detected_language": "mr",
            "processed_text": text,
            "translation_needed": True,
            "confidence": 0.8,
        }

    # Default to English
    return {
        "detected_language": "en",
        "processed_text": text,
        "confidence": 1.0,
        "translation_needed": False,
    }


async def translate_text(
    text: str, source_lang: str, target_lang: str
) -> Dict[str, Any]:
    """Translate text between languages."""
    if source_lang == target_lang:
        return {"translated_text": text, "confidence": 1.0}

    return {
        "translated_text": f"Translated to {target_lang}: {text}",
        "confidence": 0.9,
    }


async def get_nlu_intent_and_entities(text: str, language: str) -> Dict[str, Any]:
    """Get intent and entities from Rasa NLU."""
    RASA_API_URL = settings.RASA_API_URL or "http://localhost:5005"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{RASA_API_URL}/model/parse",
                json={"text": text, "language": language},
                timeout=10.0,
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

            return {"intent": best_intent, "entities": data.get("entities", [])}
    except Exception as e:
        print(f"Error calling Rasa NLU: {e}")
        return {"intent": "general_query", "entities": []}


async def retrieve_context_documents(
    query: str, language: str = "en", top_k: int = 5
) -> Dict[str, Any]:
    """Retrieve context documents using RAG."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.BACKEND_URL}/api/v1/documents/search",
                json={"query": query, "language": language, "top_k": top_k},
                timeout=10.0,
            )

            if response.status_code != 200:
                return {"retrieved_chunks": [], "sources": []}

            data = response.json()
            return {
                "retrieved_chunks": data.get("chunks", []),
                "sources": data.get("sources", []),
            }
    except Exception as e:
        print(f"Error retrieving context documents: {e}")
        return {"retrieved_chunks": [], "sources": []}


async def generate_static_response(intent: str, lang: str) -> ChatResponse:
    """Generate static responses for specific intents."""
    reply = ""
    action = intent

    if intent == "request_human_handoff":
        reply = "I've escalated your query to a human assistant. Your request ID is: REQ-1234. A staff member will join this chat shortly."
        action = "handoff"
    elif intent == "out_of_scope":
        reply = "I can only help with college-related topics like admissions, fees, and timetables. Please ask something within my scope."
        action = "out_of_scope"
    else:
        # Default fallback for unhandled intents
        reply = "I'm sorry, I didn't understand that. Could you please rephrase?"
        action = "general_fallback"

    # Basic translation simulation for static responses if not English
    if lang != "en":
        translation_result = await translate_text(reply, "en", lang)
        if translation_result["confidence"] > 0.5:
            reply = translation_result["translated_text"]

    return ChatResponse(
        reply=reply,
        confidence=1.0,  # High confidence for static, predefined responses
        source_ids=[],
        action=action,
        translated=lang != "en",
        original_language=lang,
    )


@router.post("/text", response_model=ChatResponse)
async def chat_text(
    request: ChatRequest,
    llm_service: LLMService = Depends(get_llm_service),
    rag_service: RAGService = Depends(get_rag_service),
    translation_service: TranslationService = Depends(get_translation_service),
):
    """Process text chat requests with full orchestration."""
    try:
        # Check cache first
        cache_key = f"chat:{hashlib.sha256(request.message.encode()).hexdigest()}"
        cached_response = cache_get(cache_key)
        if cached_response:
            return ChatResponse(**json.loads(cached_response))

        # Use the new translation service for language detection and translation
        translation_helper = TranslationHelper(translation_service)
        query_info = translation_helper.process_multilingual_query(request.message)

        english_text = query_info["english_query"]
        original_language = query_info["detected_language"]
        needs_translation = query_info["needs_response_translation"]

        # Get intent and entities from Rasa NLU (skip in demo mode)
        intent = "general_query"
        entities = []
        if not settings.DEMO_MODE:
            nlu_result = await get_nlu_intent_and_entities(english_text, "en")
            intent = nlu_result["intent"]
            entities = nlu_result["entities"]

        response: ChatResponse

        # Handle specific intents that don't require LLM/RAG
        if intent in ["out_of_scope", "request_human_handoff"]:
            response = await generate_static_response(intent, original_language)
        else:
            # RAG Retrieval - now works in both demo and production modes
            context = []
            source_ids = []

            # Use the RAG service to get relevant context
            rag_results = rag_service.search(
                query=english_text, top_k=5, score_threshold=0.3
            )

            if rag_results:
                context = [r["text"] for r in rag_results]
                source_ids = list(set(r["doc_id"] for r in rag_results))

            # Generate response using LLM with RAG context
            llm_response = llm_service.generate_response(english_text, context)

            # Translate response back to original language if needed
            final_response = llm_response
            if needs_translation:
                translated, _ = translation_helper.translate_response_to_original(
                    llm_response, original_language
                )
                final_response = translated

            response = ChatResponse(
                reply=final_response,
                source_ids=source_ids,
                action="answer:llm" if context else "answer:llm_no_context",
                translated=needs_translation,
                original_language=original_language,
                confidence=query_info["confidence"] if context else 0.5,
            )

        # Cache the response
        cache_set(cache_key, json.dumps(response.model_dump()))

        return response
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing chat request: {str(e)}"
        )


@router.post("/voice", response_model=ChatResponse)
async def chat_voice(
    audio_file: UploadFile = File(...),
    stt_service: STTService = Depends(get_stt_service),
    llm_service: LLMService = Depends(get_llm_service),
    rag_service: RAGService = Depends(get_rag_service),
    translation_service: TranslationService = Depends(get_translation_service),
):
    """Process voice chat requests."""
    try:
        audio_data = await audio_file.read()
        transcribed_text = stt_service.transcribe_audio(audio_data)

        # Create a ChatRequest and process it through the text endpoint logic
        request = ChatRequest(message=transcribed_text)
        return await chat_text(request, llm_service, rag_service, translation_service)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing voice request: {str(e)}"
        )


@router.post("/voice/transcribe")
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    language: str = Form(default="en"),
    stt_service: STTService = Depends(get_stt_service),
):
    """
    Transcribe audio to text without generating a chat response.

    This endpoint is used for voice input functionality where the user
    wants to convert speech to text before sending as a message.
    """
    try:
        # Read audio data
        audio_data = await audio_file.read()

        # Transcribe using STT service
        transcribed_text = stt_service.transcribe_audio(audio_data, language=language)

        # Get audio duration (if available)
        duration = len(audio_data) / (
            16000 * 2
        )  # Rough estimate for 16kHz 16-bit audio

        return JSONResponse(
            content={
                "text": transcribed_text,
                "language": language,
                "confidence": 0.9,  # STT service should provide this
                "duration": round(duration, 2),
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error transcribing audio: {str(e)}"
        )
