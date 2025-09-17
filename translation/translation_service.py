"""
High-level translation service that combines language detection and translation
"""

import logging
from typing import Dict, List, Optional, Any
from .language_detector import LanguageDetector
from .translator import MarianTranslator

logger = logging.getLogger(__name__)

class TranslationService:
    """Complete translation service with detection and translation"""
    
    def __init__(self):
        """Initialize translation service"""
        self.language_detector = LanguageDetector()
        self.translator = MarianTranslator()
        
        # Default target language for responses
        self.default_response_language = 'en'
    
    def process_user_input(self, text: str, preferred_lang: Optional[str] = None) -> Dict[str, Any]:
        """
        Process user input with language detection and optional translation
        
        Args:
            text: User input text
            preferred_lang: User's preferred language (optional)
            
        Returns:
            Dictionary with processed text and language information
        """
        if not text or not text.strip():
            return {
                'original_text': text,
                'processed_text': text,
                'detected_language': 'en',
                'confidence': 0.0,
                'translation_needed': False,
                'translation_result': None
            }
        
        # Detect language
        detection_result = self.language_detector.detect_language(text)
        detected_lang = detection_result['language']
        
        logger.info(f"Detected language: {detected_lang} (confidence: {detection_result['confidence']})")
        
        # Determine if translation is needed
        target_lang = preferred_lang or self.default_response_language
        translation_needed = self.translator.is_translation_needed(detected_lang, target_lang)
        
        translation_result = None
        processed_text = text
        
        # Perform translation if needed
        if translation_needed:
            translation_result = self.translator.translate(text, detected_lang, target_lang)
            if translation_result['confidence'] > 0.5:
                processed_text = translation_result['translated_text']
                logger.info(f"Translated '{text}' -> '{processed_text}'")
            else:
                logger.warning(f"Translation confidence too low: {translation_result['confidence']}")
        
        return {
            'original_text': text,
            'processed_text': processed_text,
            'detected_language': detected_lang,
            'detection_confidence': detection_result['confidence'],
            'detection_details': detection_result,
            'translation_needed': translation_needed,
            'translation_result': translation_result,
            'target_language': target_lang
        }
    
    def translate_response(self, response_text: str, target_lang: str) -> Dict[str, Any]:
        """
        Translate response text to target language
        
        Args:
            response_text: Response text to translate
            target_lang: Target language code
            
        Returns:
            Translation result
        """
        if target_lang == 'en' or not response_text:
            return {
                'translated_text': response_text,
                'source_lang': 'en',
                'target_lang': target_lang,
                'confidence': 1.0,
                'method': 'no_translation_needed'
            }
        
        return self.translator.translate(response_text, 'en', target_lang)
    
    def get_language_suggestions(self, text: str) -> List[Dict[str, Any]]:
        """
        Get language suggestions with confidence scores
        
        Args:
            text: Input text to analyze
            
        Returns:
            List of language suggestions with scores
        """
        detection_result = self.language_detector.detect_language(text)
        
        suggestions = [{
            'language': detection_result['language'],
            'language_name': self.language_detector.get_language_name(detection_result['language']),
            'confidence': detection_result['confidence'],
            'method': detection_result['method'],
            'is_primary': True
        }]
        
        # Add alternative suggestions for low confidence detections
        if detection_result['confidence'] < 0.7:
            # Add common alternatives
            alternatives = ['en', 'hi', 'mr']
            for alt_lang in alternatives:
                if alt_lang != detection_result['language']:
                    suggestions.append({
                        'language': alt_lang,
                        'language_name': self.language_detector.get_language_name(alt_lang),
                        'confidence': 0.3,
                        'method': 'alternative_suggestion',
                        'is_primary': False
                    })
        
        return suggestions
    
    def handle_marwari_fallback(self, text: str) -> Dict[str, Any]:
        """
        Handle Marwari text with fallback to Hindi/English
        
        Args:
            text: Marwari text
            
        Returns:
            Processing result with fallback information
        """
        # Translate to Hindi first
        hindi_result = self.translator.translate(text, 'mwr', 'hi')
        
        # Then to English for broader understanding
        english_result = self.translator.translate(text, 'mwr', 'en')
        
        return {
            'original_text': text,
            'hindi_translation': hindi_result,
            'english_translation': english_result,
            'recommended_response_lang': 'hi',  # Respond in Hindi for Marwari users
            'fallback_strategy': 'marwari_to_hindi_english'
        }
    
    def get_service_stats(self) -> Dict[str, Any]:
        """Get translation service statistics"""
        return {
            'language_detector': {
                'supported_languages': ['en', 'hi', 'mr', 'mwr'],
                'detection_methods': ['script_analysis', 'pattern_matching', 'langdetect']
            },
            'translator': self.translator.get_model_info(),
            'supported_pairs': self.translator.get_supported_pairs()
        }
    
    def validate_language_code(self, lang_code: str) -> bool:
        """Validate if language code is supported"""
        return self.language_detector.is_supported_language(lang_code)
