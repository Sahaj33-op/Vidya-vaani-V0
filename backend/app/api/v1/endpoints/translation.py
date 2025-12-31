"""
Translation API endpoints
Provides language detection and translation functionality
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from app.services.translation_service import TranslationService, SUPPORTED_LANGUAGES
from app.dependencies import get_translation_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class DetectLanguageRequest(BaseModel):
    """Request model for language detection"""
    text: str = Field(..., min_length=1, max_length=5000, description="Text to detect language for")


class DetectLanguageResponse(BaseModel):
    """Response model for language detection"""
    detected_language: str
    language_name: str
    confidence: float
    is_supported: bool
    fallback_language: Optional[str] = None


class TranslateRequest(BaseModel):
    """Request model for translation"""
    text: str = Field(..., min_length=1, max_length=5000, description="Text to translate")
    source_language: str = Field(..., description="Source language code (e.g., 'hi', 'en')")
    target_language: str = Field(..., description="Target language code (e.g., 'en', 'hi')")


class TranslateResponse(BaseModel):
    """Response model for translation"""
    translated_text: str
    source_language: str
    target_language: str
    confidence: float
    is_mock: bool = False
    note: Optional[str] = None


class SupportedLanguagesResponse(BaseModel):
    """Response model for supported languages"""
    languages: Dict[str, str]
    total_count: int


class ProcessQueryRequest(BaseModel):
    """Request model for processing a multilingual query"""
    query: str = Field(..., min_length=1, max_length=5000, description="User query in any supported language")


class ProcessQueryResponse(BaseModel):
    """Response model for processed query"""
    original_query: str
    english_query: str
    detected_language: str
    language_name: str
    confidence: float
    is_supported: bool
    needs_response_translation: bool


@router.post("/detect", response_model=DetectLanguageResponse)
async def detect_language(
    request: DetectLanguageRequest,
    translation_service: TranslationService = Depends(get_translation_service)
):
    """
    Detect the language of the given text.

    Returns the detected language code, name, and confidence score.
    """
    try:
        logger.info(f"Detecting language for text: {request.text[:50]}...")

        result = translation_service.detect_language(request.text)

        return DetectLanguageResponse(
            detected_language=result['detected_language'],
            language_name=result.get('language_name', 'Unknown'),
            confidence=result['confidence'],
            is_supported=result.get('is_supported', True),
            fallback_language=result.get('fallback_language')
        )

    except Exception as e:
        logger.error(f"Language detection error: {e}")
        raise HTTPException(status_code=500, detail=f"Language detection failed: {str(e)}")


@router.post("/translate", response_model=TranslateResponse)
async def translate_text(
    request: TranslateRequest,
    translation_service: TranslationService = Depends(get_translation_service)
):
    """
    Translate text from source language to target language.

    Supports English (en), Hindi (hi), Marathi (mr), and Marwari (mwr).
    """
    try:
        # Validate language codes
        if request.source_language not in SUPPORTED_LANGUAGES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported source language: {request.source_language}. Supported: {list(SUPPORTED_LANGUAGES.keys())}"
            )

        if request.target_language not in SUPPORTED_LANGUAGES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported target language: {request.target_language}. Supported: {list(SUPPORTED_LANGUAGES.keys())}"
            )

        logger.info(f"Translating from {request.source_language} to {request.target_language}")

        result = translation_service.translate(
            text=request.text,
            source_lang=request.source_language,
            target_lang=request.target_language
        )

        return TranslateResponse(
            translated_text=result['translated_text'],
            source_language=result['source_language'],
            target_language=result['target_language'],
            confidence=result['confidence'],
            is_mock=result.get('is_mock', False),
            note=result.get('note')
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Translation error: {e}")
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")


@router.get("/languages", response_model=SupportedLanguagesResponse)
async def get_supported_languages(
    translation_service: TranslationService = Depends(get_translation_service)
):
    """
    Get list of supported languages.

    Returns language codes and their full names.
    """
    try:
        languages = translation_service.get_supported_languages()

        return SupportedLanguagesResponse(
            languages=languages,
            total_count=len(languages)
        )

    except Exception as e:
        logger.error(f"Get languages error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get languages: {str(e)}")


@router.post("/process-query", response_model=ProcessQueryResponse)
async def process_multilingual_query(
    request: ProcessQueryRequest,
    translation_service: TranslationService = Depends(get_translation_service)
):
    """
    Process a multilingual query.

    Detects the language and translates to English if needed.
    Returns the English version of the query for further processing.
    """
    try:
        from app.services.translation_service import TranslationHelper

        helper = TranslationHelper(translation_service)
        result = helper.process_multilingual_query(request.query)

        return ProcessQueryResponse(
            original_query=result['original_query'],
            english_query=result['english_query'],
            detected_language=result['detected_language'],
            language_name=result['language_name'],
            confidence=result['confidence'],
            is_supported=result['is_supported'],
            needs_response_translation=result['needs_response_translation']
        )

    except Exception as e:
        logger.error(f"Process query error: {e}")
        raise HTTPException(status_code=500, detail=f"Query processing failed: {str(e)}")


@router.post("/translate-response")
async def translate_response(
    text: str,
    target_language: str,
    translation_service: TranslationService = Depends(get_translation_service)
):
    """
    Translate a response from English to target language.

    Used to translate bot responses back to the user's language.
    """
    try:
        if target_language == 'en':
            return {
                'translated_text': text,
                'target_language': 'en',
                'was_translated': False
            }

        if target_language not in SUPPORTED_LANGUAGES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported target language: {target_language}"
            )

        result = translation_service.translate(text, 'en', target_language)

        return {
            'translated_text': result['translated_text'],
            'target_language': target_language,
            'was_translated': True,
            'confidence': result['confidence']
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Translate response error: {e}")
        raise HTTPException(status_code=500, detail=f"Response translation failed: {str(e)}")
