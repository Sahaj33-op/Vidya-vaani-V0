"""
Production Translation Service using MarianMT
Supports English, Hindi, Marathi, and Marwari translation
"""

import logging
from functools import lru_cache
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

try:
    from transformers import MarianMTModel, MarianTokenizer

    MARIAN_AVAILABLE = True
except ImportError:
    MARIAN_AVAILABLE = False
    logger.warning(
        "transformers not installed. Install with: pip install transformers torch sentencepiece"
    )


class MarianTranslationService:
    """
    Production translation service using MarianMT models
    Supports offline translation without API costs
    """

    MODEL_MAPPING = {
        ("en", "hi"): "Helsinki-NLP/opus-mt-en-hi",
        ("hi", "en"): "Helsinki-NLP/opus-mt-hi-en",
        ("en", "mr"): "Helsinki-NLP/opus-mt-en-mr",
        ("mr", "en"): "Helsinki-NLP/opus-mt-mr-en",
    }

    def __init__(self):
        if not MARIAN_AVAILABLE:
            raise RuntimeError(
                "MarianMT not available. Install: pip install transformers torch sentencepiece"
            )

        self.models = {}
        self.tokenizers = {}
        logger.info("MarianTranslationService initialized")

    @lru_cache(maxsize=10)
    def _load_model(self, model_name: str):
        """Load and cache translation model"""
        logger.info(f"Loading MarianMT model: {model_name}")

        try:
            tokenizer = MarianTokenizer.from_pretrained(model_name)
            model = MarianMTModel.from_pretrained(model_name)

            return tokenizer, model
        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            raise

    def translate(
        self, text: str, source_lang: str, target_lang: str
    ) -> Dict[str, Any]:
        """
        Translate text between languages

        Args:
            text: Text to translate
            source_lang: Source language code (en, hi, mr, mwr)
            target_lang: Target language code

        Returns:
            Dict with translated_text, source_language, target_language, confidence
        """
        if not text or not text.strip():
            return {
                "translated_text": "",
                "source_language": source_lang,
                "target_language": target_lang,
                "confidence": 0.0,
                "provider": "marian",
            }

        if source_lang == target_lang:
            return {
                "translated_text": text,
                "source_language": source_lang,
                "target_language": target_lang,
                "confidence": 1.0,
                "provider": "marian",
            }

        model_key = (source_lang, target_lang)

        if source_lang == "mwr":
            logger.warning(
                "Marwari not directly supported by MarianMT, using Hindi as proxy"
            )
            model_key = ("hi", target_lang)
        elif target_lang == "mwr":
            logger.warning(
                "Marwari not directly supported by MarianMT, using Hindi as proxy"
            )
            model_key = (source_lang, "hi")

        model_name = self.MODEL_MAPPING.get(model_key)

        if not model_name:
            logger.warning(
                f"No direct translation model for {source_lang}->{target_lang}"
            )

            if source_lang != "en":
                logger.info(
                    f"Using pivot translation: {source_lang}->en->{target_lang}"
                )
                intermediate = self.translate(text, source_lang, "en")
                return self.translate(
                    intermediate["translated_text"], "en", target_lang
                )

            return {
                "translated_text": text,
                "source_language": source_lang,
                "target_language": target_lang,
                "confidence": 0.0,
                "provider": "marian",
                "error": f"Translation not supported for {source_lang}->{target_lang}",
            }

        try:
            tokenizer, model = self._load_model(model_name)

            inputs = tokenizer(
                text, return_tensors="pt", padding=True, truncation=True, max_length=512
            )

            translated = model.generate(**inputs)
            translated_text = tokenizer.decode(translated[0], skip_special_tokens=True)

            confidence = 0.85

            logger.debug(
                f"Translated ({source_lang}->{target_lang}): '{text[:50]}...' -> '{translated_text[:50]}...'"
            )

            return {
                "translated_text": translated_text,
                "source_language": source_lang,
                "target_language": target_lang,
                "confidence": confidence,
                "provider": "marian",
                "model": model_name,
            }

        except Exception as e:
            logger.error(f"Translation failed for {source_lang}->{target_lang}: {e}")
            return {
                "translated_text": text,
                "source_language": source_lang,
                "target_language": target_lang,
                "confidence": 0.0,
                "provider": "marian",
                "error": str(e),
            }

    def detect_language(self, text: str) -> Dict[str, Any]:
        """
        Detect language of input text
        Uses langdetect as MarianMT doesn't provide detection
        """
        try:
            from langdetect import LangDetectException, detect

            detected_lang = detect(text)

            lang_mapping = {
                "en": "en",
                "hi": "hi",
                "mr": "mr",
            }

            normalized_lang = lang_mapping.get(detected_lang, "en")

            return {"language": normalized_lang, "confidence": 0.9}

        except (ImportError, Exception) as e:
            logger.warning(f"Language detection failed: {e}")
            return {"language": "en", "confidence": 0.5}


def get_marian_service() -> Optional[MarianTranslationService]:
    """Factory function to create MarianTranslationService if available"""
    if not MARIAN_AVAILABLE:
        logger.warning("MarianMT not available, returning None")
        return None

    try:
        return MarianTranslationService()
    except Exception as e:
        logger.error(f"Failed to initialize MarianTranslationService: {e}")
        return None
