"""
Language detection service for multilingual chatbot
Supports English, Hindi, Marathi, and Marwari detection
"""

import re
from typing import Dict, List, Tuple, Optional
from langdetect import detect, DetectorFactory
from langdetect.lang_detect_exception import LangDetectException
import logging

# Set seed for consistent results
DetectorFactory.seed = 0

logger = logging.getLogger(__name__)

class LanguageDetector:
    """Service for detecting user input language"""
    
    def __init__(self):
        """Initialize language detector with custom rules"""
        # Marwari-specific words and patterns
        self.marwari_indicators = {
            'words': [
                'थारो', 'थारी', 'म्हारो', 'म्हारी', 'करूं', 'करो', 'करी', 
                'आवो', 'जावो', 'राखो', 'लावो', 'दीजो', 'लीजो',
                'बात', 'काम', 'घर', 'पाणी', 'खाणो', 'पीणो',
                'मारवाड़ी', 'राजस्थानी', 'जोधपुर', 'बीकानेर', 'जैसलमेर'
            ],
            'patterns': [
                r'थार[ोी]',  # थारो, थारी
                r'म्हार[ोी]',  # म्हारो, म्हारी  
                r'[कगचजतदनपबमयरलवशसह]ूं',  # Marwari verb endings
                r'[ाीुूेैोौ]ं',  # Marwari nasalization patterns
            ]
        }
        
        # Hindi-specific indicators
        self.hindi_indicators = {
            'words': [
                'आप', 'आपका', 'आपकी', 'मैं', 'मेरा', 'मेरी', 'हमारा', 'हमारी',
                'करता', 'करती', 'करते', 'करना', 'होना', 'जाना', 'आना',
                'क्या', 'कैसे', 'कहाँ', 'कब', 'क्यों', 'कौन', 'कितना',
                'हिंदी', 'भारत', 'देश', 'राज्य', 'शहर'
            ],
            'patterns': [
                r'[कगचजतदनपबमयरलवशसह][ाीुूेैोौ]*[तनम]?[ाीुूेैोौ]',
                r'[आइईउऊएऐओऔ]',
            ]
        }
        
        # Marathi-specific indicators
        self.marathi_indicators = {
            'words': [
                'आहे', 'आहेत', 'होते', 'होता', 'करतो', 'करते', 'करतात',
                'तुम्ही', 'तुमचा', 'तुमची', 'माझा', 'माझी', 'आमचा', 'आमची',
                'काय', 'कसे', 'कुठे', 'केव्हा', 'का', 'कोण', 'किती',
                'मराठी', 'महाराष्ट्र', 'मुंबई', 'पुणे'
            ],
            'patterns': [
                r'[कगचजतदनपबमयरलवशसह][ाीुूेैोौ]*तो',  # Marathi masculine endings
                r'[कगचजतदनपबमयरलवशसह][ाीुूेैोौ]*ते',  # Marathi plural endings
                r'[कगचजतदनपबमयरलवशसह][ाीुूेैोौ]*ात',  # Marathi locative case
            ]
        }
    
    def detect_language(self, text: str) -> Dict[str, any]:
        """
        Detect language of input text
        
        Args:
            text: Input text to analyze
            
        Returns:
            Dictionary with detected language, confidence, and details
        """
        if not text or not text.strip():
            return {
                'language': 'en',
                'confidence': 0.0,
                'method': 'default',
                'details': 'Empty text'
            }
        
        text = text.strip()
        
        # First check for script type
        script_info = self._analyze_script(text)
        
        # If Latin script, likely English
        if script_info['script'] == 'latin':
            return {
                'language': 'en',
                'confidence': 0.9,
                'method': 'script_analysis',
                'details': f"Latin script detected: {script_info}"
            }
        
        # If Devanagari script, analyze further
        if script_info['script'] == 'devanagari':
            # Check for Marwari indicators first (most specific)
            marwari_score = self._calculate_language_score(text, self.marwari_indicators)
            marathi_score = self._calculate_language_score(text, self.marathi_indicators)
            hindi_score = self._calculate_language_score(text, self.hindi_indicators)
            
            logger.info(f"Language scores - Marwari: {marwari_score}, Marathi: {marathi_score}, Hindi: {hindi_score}")
            
            # Determine language based on scores
            if marwari_score > 0.3:  # Strong Marwari indicators
                return {
                    'language': 'mwr',
                    'confidence': min(marwari_score, 0.95),
                    'method': 'pattern_matching',
                    'details': f"Marwari patterns detected, score: {marwari_score}"
                }
            elif marathi_score > marwari_score and marathi_score > hindi_score and marathi_score > 0.2:
                return {
                    'language': 'mr',
                    'confidence': min(marathi_score, 0.9),
                    'method': 'pattern_matching',
                    'details': f"Marathi patterns detected, score: {marathi_score}"
                }
            else:
                # Default to Hindi for Devanagari script
                confidence = max(hindi_score, 0.7)  # Minimum confidence for Hindi
                return {
                    'language': 'hi',
                    'confidence': confidence,
                    'method': 'pattern_matching',
                    'details': f"Hindi patterns detected, score: {hindi_score}"
                }
        
        # Fallback to langdetect library
        try:
            detected_lang = detect(text)
            confidence = 0.8  # Default confidence for langdetect
            
            # Map langdetect codes to our supported languages
            lang_mapping = {
                'hi': 'hi',
                'mr': 'mr', 
                'en': 'en'
            }
            
            mapped_lang = lang_mapping.get(detected_lang, 'en')
            
            return {
                'language': mapped_lang,
                'confidence': confidence,
                'method': 'langdetect',
                'details': f"Langdetect result: {detected_lang} -> {mapped_lang}"
            }
            
        except LangDetectException as e:
            logger.warning(f"Language detection failed: {e}")
            return {
                'language': 'en',
                'confidence': 0.5,
                'method': 'fallback',
                'details': f"Detection failed, defaulting to English: {e}"
            }
    
    def _analyze_script(self, text: str) -> Dict[str, any]:
        """Analyze the script type of the text"""
        devanagari_chars = 0
        latin_chars = 0
        total_chars = 0
        
        for char in text:
            if char.isalpha():
                total_chars += 1
                if '\u0900' <= char <= '\u097F':  # Devanagari Unicode range
                    devanagari_chars += 1
                elif 'a' <= char.lower() <= 'z':  # Latin script
                    latin_chars += 1
        
        if total_chars == 0:
            return {'script': 'unknown', 'devanagari_ratio': 0, 'latin_ratio': 0}
        
        devanagari_ratio = devanagari_chars / total_chars
        latin_ratio = latin_chars / total_chars
        
        # Determine primary script
        if devanagari_ratio > 0.5:
            script = 'devanagari'
        elif latin_ratio > 0.5:
            script = 'latin'
        else:
            script = 'mixed'
        
        return {
            'script': script,
            'devanagari_ratio': devanagari_ratio,
            'latin_ratio': latin_ratio,
            'total_chars': total_chars
        }
    
    def _calculate_language_score(self, text: str, indicators: Dict[str, List[str]]) -> float:
        """Calculate language score based on word and pattern matching"""
        text_lower = text.lower()
        words = text.split()
        
        word_matches = 0
        pattern_matches = 0
        
        # Check word indicators
        for word in indicators['words']:
            if word in text_lower:
                word_matches += 1
        
        # Check pattern indicators
        for pattern in indicators['patterns']:
            matches = re.findall(pattern, text)
            pattern_matches += len(matches)
        
        # Calculate score (normalized)
        total_words = len(words)
        if total_words == 0:
            return 0.0
        
        word_score = word_matches / max(total_words, 1)
        pattern_score = pattern_matches / max(len(text), 1)
        
        # Weighted combination
        final_score = (word_score * 0.7) + (pattern_score * 0.3)
        
        return min(final_score, 1.0)
    
    def is_supported_language(self, lang_code: str) -> bool:
        """Check if language is supported"""
        supported_languages = ['en', 'hi', 'mr', 'mwr']
        return lang_code in supported_languages
    
    def get_language_name(self, lang_code: str) -> str:
        """Get human-readable language name"""
        language_names = {
            'en': 'English',
            'hi': 'Hindi',
            'mr': 'Marathi', 
            'mwr': 'Marwari'
        }
        return language_names.get(lang_code, 'Unknown')
