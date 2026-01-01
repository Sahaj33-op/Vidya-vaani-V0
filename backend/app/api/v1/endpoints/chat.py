"""
Chat API Endpoint - Simplified without Rasa NLU
Gemini handles everything: understanding, context, and multilingual responses
"""

import hashlib
import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

from app.api.models.chat import ChatRequest, ChatResponse
from app.core.config import settings
from app.dependencies import (
    get_llm_service,
    get_rag_service,
    get_stt_service,
    get_translation_service,
)
from app.services.llm_service import LLMService
from app.services.rag_service import RAGService
from app.services.stt_service import STTService
from app.services.translation_service import TranslationHelper, TranslationService

router = APIRouter()

# In-memory cache
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


def detect_language(text: str) -> str:
    """Simple language detection based on script/characters"""
    # Devanagari script (Hindi/Marathi)
    if any("\u0900" <= char <= "\u097f" for char in text):
        # Distinguish Hindi from Marathi based on common words
        if any(word in text for word in ["आहे", "नमस्कार", "काय", "कसे"]):
            return "mr"  # Marathi
        return "hi"  # Hindi

    # Check for Marwari (also uses Devanagari but with specific words)
    if any(word in text for word in ["थारो", "म्हारो", "राम", "राम"]):
        return "mwr"

    return "en"  # Default to English


@router.get("/suggested-questions")
async def get_suggested_questions():
    """Get suggested questions for better UX"""
    return {
        "en": [
            "What is the admission process?",
            "How much are the fees?",
            "Tell me about scholarships",
            "What courses do you offer?",
            "How can I apply for hostel?",
        ],
        "hi": [
            "प्रवेश प्रक्रिया क्या है?",
            "फीस कितनी है?",
            "छात्रवृत्ति के बारे में बताएं",
            "कौन से कोर्स उपलब्ध हैं?",
            "हॉस्टल के लिए कैसे आवेदन करें?",
        ],
        "mr": [
            "प्रवेश प्रक्रिया काय आहे?",
            "फी किती आहे?",
            "शिष्यवृत्तीबद्दल सांगा",
            "कोणते अभ्यासक्रम उपलब्ध आहेत?",
            "वसतिगृहासाठी कसा अर्ज करावा?",
        ],
        "mwr": [
            "दाखिला प्रक्रिया क्या है?",
            "फीस कितनी है?",
            "छात्रवृत्ति के बारे में बताओ",
            "कौनसे कोर्स मिलेंगे?",
            "हॉस्टल में कैसे आवेदन करें?",
        ],
    }


@router.post("/text", response_model=ChatResponse)
async def chat_text(
    request: ChatRequest,
    llm_service: LLMService = Depends(get_llm_service),
    rag_service: RAGService = Depends(get_rag_service),
    translation_service: TranslationService = Depends(get_translation_service),
):
    """
    Process text chat requests.

    NEW APPROACH:
    - Detect language from user query
    - Use RAG to find relevant context (in English documents)
    - Pass EVERYTHING to Gemini with instruction to respond in user's language
    - Gemini handles understanding + multilingual response generation
    """
    try:
        user_message = request.message.strip()

        # Detect user's language
        detected_lang = detect_language(user_message)

        logger.info(f"User message: {user_message[:50]}... (lang: {detected_lang})")

        # Get relevant documents from RAG (always search in English)
        # For non-English queries, we translate query for RAG search
        translation_helper = TranslationHelper(translation_service)

        # Translate query to English for RAG search
        search_query = user_message
        if detected_lang != "en":
            # Simple translation for RAG search
            query_info = translation_helper.process_multilingual_query(user_message)
            search_query = query_info.get("english_query", user_message)

        # Search for relevant documents
        rag_results = rag_service.search(
            query=search_query,
            top_k=3,  # Limit to top 3 for better token efficiency
            score_threshold=0.3,
        )

        # Prepare context from RAG
        context_docs = []
        source_ids = []
        if rag_results:
            context_docs = [r["text"] for r in rag_results]
            source_ids = list(set(r["doc_id"] for r in rag_results))
            logger.info(f"Found {len(context_docs)} relevant documents")

        # Build enhanced prompt for Gemini with multilingual instructions
        language_names = {
            "en": "English",
            "hi": "Hindi",
            "mr": "Marathi",
            "mwr": "Marwari",
        }

        response_language = language_names.get(detected_lang, "English")

        # Create multilingual-aware prompt
        enhanced_prompt = f"""User Question (in {response_language}): {user_message}

IMPORTANT INSTRUCTIONS:
1. The user asked their question in {response_language}
2. You MUST respond in {response_language} (the same language as the question)
3. Use the context below to provide accurate information
4. Keep your answer concise (under 150 words)
5. Be helpful and friendly

Context from our knowledge base:
{chr(10).join(context_docs) if context_docs else "No specific documents found. Use your general knowledge about college admissions and education."}

Respond in {response_language}:"""

        # Generate response using Gemini
        llm_response = llm_service.generate_response(
            prompt=enhanced_prompt, context=context_docs if context_docs else None
        )

        logger.info(f"Generated response (first 100 chars): {llm_response[:100]}...")

        response = ChatResponse(
            reply=llm_response,
            source_ids=source_ids,
            action="answer:gemini",
            translated=False,  # Gemini generates directly in target language
            original_language=detected_lang,
            confidence=0.9 if context_docs else 0.7,
        )

        return response

    except Exception as e:
        logger.error(f"Chat processing error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Unable to process your request. Please try again later.",
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
        logger.error(f"Voice processing error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Unable to process voice request. Please try again later.",
        )


@router.post("/voice/transcribe")
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    language: str = Form(default="en"),
    stt_service: STTService = Depends(get_stt_service),
):
    """
    Transcribe audio to text without generating a chat response.
    """
    try:
        audio_data = await audio_file.read()
        transcribed_text = stt_service.transcribe_audio(audio_data)

        duration = len(audio_data) / (16000 * 2)  # Rough estimate

        return JSONResponse(
            content={
                "text": transcribed_text,
                "language": language,
                "confidence": 0.9,
                "duration": round(duration, 2),
            }
        )
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Unable to transcribe audio. Please try again."
        )
