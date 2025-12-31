"""
Translation Service for multilingual support
Provides language detection and translation between supported languages
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Tuple
import logging
import re

logger = logging.getLogger(__name__)

# Supported languages
SUPPORTED_LANGUAGES = {
    'en': 'English',
    'hi': 'Hindi',
    'mr': 'Marathi',
    'mwr': 'Marwari'  # Note: Marwari has limited NLP support
}


class TranslationService(ABC):
    """Abstract base class for translation services"""

    @abstractmethod
    def detect_language(self, text: str) -> Dict[str, Any]:
        """Detect the language of the given text"""
        pass

    @abstractmethod
    def translate(self, text: str, source_lang: str, target_lang: str) -> Dict[str, Any]:
        """Translate text from source language to target language"""
        pass

    @abstractmethod
    def get_supported_languages(self) -> Dict[str, str]:
        """Get list of supported languages"""
        pass


class MockTranslationService(TranslationService):
    """Mock translation service for demo mode with keyword-based detection"""

    def __init__(self):
        # Hindi keywords and phrases
        self.hindi_patterns = [
            r'नमस्ते', r'धन्यवाद', r'कृपया', r'क्या', r'कैसे', r'कब', r'कहाँ',
            r'फीस', r'प्रवेश', r'समय', r'कॉलेज', r'पढ़ाई', r'परीक्षा', r'छात्र',
            r'है', r'हैं', r'का', r'की', r'के', r'में', r'से', r'को', r'और',
            r'मैं', r'हम', r'आप', r'यह', r'वह', r'जो', r'कि', r'लेकिन',
            r'एडमिशन', r'स्कॉलरशिप', r'हॉस्टल', r'प्लेसमेंट', r'कोर्स'
        ]

        # Marathi keywords and phrases
        self.marathi_patterns = [
            r'नमस्कार', r'धन्यवाद', r'कृपया', r'काय', r'कसे', r'केव्हा', r'कुठे',
            r'फी', r'प्रवेश', r'वेळ', r'महाविद्यालय', r'शिक्षण', r'परीक्षा', r'विद्यार्थी',
            r'आहे', r'आहेत', r'चा', r'ची', r'चे', r'मध्ये', r'पासून', r'ला', r'आणि',
            r'मी', r'आम्ही', r'तुम्ही', r'हे', r'ते', r'जे', r'की', r'पण'
        ]

        # Common Hindi-English translations for demo
        self.hindi_to_english = {
            'नमस्ते': 'Hello',
            'धन्यवाद': 'Thank you',
            'कृपया': 'Please',
            'फीस': 'fees',
            'प्रवेश': 'admission',
            'समय': 'time',
            'कॉलेज': 'college',
            'परीक्षा': 'exam',
            'छात्रवृत्ति': 'scholarship',
            'हॉस्टल': 'hostel',
            'प्लेसमेंट': 'placement',
            'कोर्स': 'course',
            'क्या है': 'what is',
            'कैसे': 'how',
            'कब': 'when',
            'कहाँ': 'where'
        }

        # Common English-Hindi translations for demo
        self.english_to_hindi = {
            'hello': 'नमस्ते',
            'thank you': 'धन्यवाद',
            'please': 'कृपया',
            'fees': 'फीस',
            'admission': 'प्रवेश',
            'time': 'समय',
            'college': 'कॉलेज',
            'exam': 'परीक्षा',
            'scholarship': 'छात्रवृत्ति',
            'hostel': 'हॉस्टल',
            'placement': 'प्लेसमेंट',
            'course': 'कोर्स',
            'what is': 'क्या है',
            'how': 'कैसे',
            'when': 'कब',
            'where': 'कहाँ'
        }

        logger.info("MockTranslationService initialized")

    def detect_language(self, text: str) -> Dict[str, Any]:
        """Detect language using pattern matching"""
        text_lower = text.lower()

        # Count matches for each language
        hindi_score = sum(1 for pattern in self.hindi_patterns if re.search(pattern, text, re.IGNORECASE))
        marathi_score = sum(1 for pattern in self.marathi_patterns if re.search(pattern, text, re.IGNORECASE))

        # Check for Devanagari script
        devanagari_chars = len(re.findall(r'[\u0900-\u097F]', text))
        total_chars = len(text.replace(' ', ''))

        if total_chars == 0:
            return {
                'detected_language': 'en',
                'language_name': 'English',
                'confidence': 1.0,
                'is_supported': True
            }

        devanagari_ratio = devanagari_chars / total_chars if total_chars > 0 else 0

        # Determine language based on scores and script
        if devanagari_ratio > 0.3:
            if marathi_score > hindi_score:
                return {
                    'detected_language': 'mr',
                    'language_name': 'Marathi',
                    'confidence': min(0.6 + marathi_score * 0.1, 0.95),
                    'is_supported': True
                }
            elif hindi_score > 0 or devanagari_ratio > 0.5:
                return {
                    'detected_language': 'hi',
                    'language_name': 'Hindi',
                    'confidence': min(0.6 + hindi_score * 0.1, 0.95),
                    'is_supported': True
                }

        # Default to English
        return {
            'detected_language': 'en',
            'language_name': 'English',
            'confidence': 0.9 if devanagari_ratio < 0.1 else 0.6,
            'is_supported': True
        }

    def translate(self, text: str, source_lang: str, target_lang: str) -> Dict[str, Any]:
        """Mock translation with keyword replacement"""
        if source_lang == target_lang:
            return {
                'translated_text': text,
                'source_language': source_lang,
                'target_language': target_lang,
                'confidence': 1.0,
                'is_mock': True
            }

        translated = text

        # Simple keyword-based translation
        if source_lang == 'hi' and target_lang == 'en':
            for hindi, english in self.hindi_to_english.items():
                translated = translated.replace(hindi, english)
            # Add note for demo
            if translated != text:
                translated = f"[Translated from Hindi] {translated}"

        elif source_lang == 'en' and target_lang == 'hi':
            text_lower = text.lower()
            for english, hindi in self.english_to_hindi.items():
                if english in text_lower:
                    translated = re.sub(re.escape(english), hindi, translated, flags=re.IGNORECASE)
            if translated != text:
                translated = f"[हिंदी में अनुवादित] {translated}"

        elif source_lang == 'mr' and target_lang == 'en':
            translated = f"[Translated from Marathi] {text}"

        elif source_lang == 'en' and target_lang == 'mr':
            translated = f"[मराठी मध्ये अनुवादित] {text}"

        else:
            # For unsupported language pairs, just mark as translated
            translated = f"[Translated: {source_lang} -> {target_lang}] {text}"

        return {
            'translated_text': translated,
            'source_language': source_lang,
            'target_language': target_lang,
            'confidence': 0.7,
            'is_mock': True
        }

    def get_supported_languages(self) -> Dict[str, str]:
        """Get list of supported languages"""
        return SUPPORTED_LANGUAGES.copy()


class LangdetectTranslationService(TranslationService):
    """Translation service using langdetect for language detection"""

    def __init__(self):
        try:
            from langdetect import detect, detect_langs
            self._detect = detect
            self._detect_langs = detect_langs
            self._langdetect_available = True
        except ImportError:
            logger.warning("langdetect not installed, falling back to pattern matching")
            self._langdetect_available = False
            self._fallback = MockTranslationService()

        # Language code mapping (langdetect uses ISO 639-1)
        self.lang_code_map = {
            'en': 'en',
            'hi': 'hi',
            'mr': 'mr',
            'mwr': 'hi'  # Map Marwari to Hindi as fallback
        }

        logger.info("LangdetectTranslationService initialized")

    def detect_language(self, text: str) -> Dict[str, Any]:
        """Detect language using langdetect library"""
        if not self._langdetect_available:
            return self._fallback.detect_language(text)

        if not text or len(text.strip()) < 3:
            return {
                'detected_language': 'en',
                'language_name': 'English',
                'confidence': 0.5,
                'is_supported': True
            }

        try:
            # Get language probabilities
            lang_probs = self._detect_langs(text)

            if not lang_probs:
                return {
                    'detected_language': 'en',
                    'language_name': 'English',
                    'confidence': 0.5,
                    'is_supported': True
                }

            # Get top detected language
            top_lang = lang_probs[0]
            detected_code = str(top_lang.lang)
            confidence = float(top_lang.prob)

            # Check if it's a supported language
            if detected_code in SUPPORTED_LANGUAGES:
                return {
                    'detected_language': detected_code,
                    'language_name': SUPPORTED_LANGUAGES[detected_code],
                    'confidence': confidence,
                    'is_supported': True
                }
            else:
                # Unsupported language, default to English
                return {
                    'detected_language': detected_code,
                    'language_name': f'Unknown ({detected_code})',
                    'confidence': confidence,
                    'is_supported': False,
                    'fallback_language': 'en'
                }

        except Exception as e:
            logger.error(f"Language detection failed: {e}")
            return {
                'detected_language': 'en',
                'language_name': 'English',
                'confidence': 0.5,
                'is_supported': True,
                'error': str(e)
            }

    def translate(self, text: str, source_lang: str, target_lang: str) -> Dict[str, Any]:
        """
        Translation placeholder - in production, integrate with:
        - Google Translate API
        - Microsoft Translator
        - MarianMT (for offline translation)
        - IndicTrans (for Indian languages)
        """
        if source_lang == target_lang:
            return {
                'translated_text': text,
                'source_language': source_lang,
                'target_language': target_lang,
                'confidence': 1.0,
                'is_mock': False
            }

        # For now, use mock translation
        # TODO: Integrate with real translation API
        mock_service = MockTranslationService()
        result = mock_service.translate(text, source_lang, target_lang)
        result['note'] = 'Using mock translation. Configure translation API for production.'
        return result

    def get_supported_languages(self) -> Dict[str, str]:
        """Get list of supported languages"""
        return SUPPORTED_LANGUAGES.copy()


class TranslationHelper:
    """Helper class for common translation operations"""

    def __init__(self, service: TranslationService):
        self.service = service

    def detect_and_translate_to_english(self, text: str) -> Tuple[str, Dict[str, Any]]:
        """
        Detect language and translate to English if needed

        Returns:
            Tuple of (translated_text, metadata)
        """
        detection = self.service.detect_language(text)
        source_lang = detection['detected_language']

        if source_lang == 'en':
            return text, {
                'original_language': 'en',
                'was_translated': False,
                'detection': detection
            }

        translation = self.service.translate(text, source_lang, 'en')

        return translation['translated_text'], {
            'original_language': source_lang,
            'was_translated': True,
            'detection': detection,
            'translation': translation
        }

    def translate_response_to_original(self, response: str, original_lang: str) -> Tuple[str, Dict[str, Any]]:
        """
        Translate response back to the original language

        Returns:
            Tuple of (translated_response, metadata)
        """
        if original_lang == 'en':
            return response, {
                'target_language': 'en',
                'was_translated': False
            }

        translation = self.service.translate(response, 'en', original_lang)

        return translation['translated_text'], {
            'target_language': original_lang,
            'was_translated': True,
            'translation': translation
        }

    def process_multilingual_query(self, query: str) -> Dict[str, Any]:
        """
        Process a multilingual query - detect language, translate to English

        Returns:
            Dictionary with processed query information
        """
        detection = self.service.detect_language(query)

        result = {
            'original_query': query,
            'detected_language': detection['detected_language'],
            'language_name': detection.get('language_name', 'Unknown'),
            'confidence': detection['confidence'],
            'is_supported': detection.get('is_supported', True)
        }

        if detection['detected_language'] != 'en':
            translation = self.service.translate(query, detection['detected_language'], 'en')
            result['english_query'] = translation['translated_text']
            result['needs_response_translation'] = True
        else:
            result['english_query'] = query
            result['needs_response_translation'] = False

        return result
