"""
Translation service using MarianMT models
Handles translation between English, Hindi, Marathi, and Marwari
"""

import os
import re
from typing import Dict, List, Optional, Tuple
from transformers import MarianMTModel, MarianTokenizer
import torch
import logging

logger = logging.getLogger(__name__)

class MarianTranslator:
    """Translation service using MarianMT models"""
    
    def __init__(self):
        """Initialize translator with model configurations"""
        self.models = {}
        self.tokenizers = {}
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Model configurations for different language pairs
        self.model_configs = {
            'hi_to_en': 'Helsinki-NLP/opus-mt-hi-en',
            'en_to_hi': 'Helsinki-NLP/opus-mt-en-hi',
            'mr_to_en': 'Helsinki-NLP/opus-mt-mr-en',
            'en_to_mr': 'Helsinki-NLP/opus-mt-en-mr',
        }
        
        # Marwari phrase mappings (since no direct model available)
        self.marwari_to_hindi_phrases = {
            'थारो': 'तुम्हारा',
            'थारी': 'तुम्हारी', 
            'म्हारो': 'मेरा',
            'म्हारी': 'मेरी',
            'करूं': 'करूंगा',
            'करो': 'करो',
            'करी': 'करूंगी',
            'आवो': 'आओ',
            'जावो': 'जाओ',
            'राखो': 'रखो',
            'लावो': 'लगाओ',
            'दीजो': 'दो',
            'लीजो': 'लो',
            'खाणो': 'खाना',
            'पीणो': 'पीना',
            'पाणी': 'पानी',
            'घर': 'घर',
            'काम': 'काम',
            'बात': 'बात',
            'कॉलेज': 'कॉलेज',
            'फीस': 'फीस',
            'प्रवेश': 'प्रवेश',
            'समय': 'समय',
            'संपर्क': 'संपर्क'
        }
        
        # Load essential models
        self._load_essential_models()
    
    def _load_essential_models(self):
        """Load essential translation models"""
        essential_models = ['hi_to_en', 'en_to_hi']
        
        for model_key in essential_models:
            try:
                self._load_model(model_key)
                logger.info(f"Loaded model: {model_key}")
            except Exception as e:
                logger.error(f"Failed to load model {model_key}: {e}")
    
    def _load_model(self, model_key: str):
        """Load a specific translation model"""
        if model_key in self.models:
            return  # Already loaded
        
        model_name = self.model_configs.get(model_key)
        if not model_name:
            raise ValueError(f"Unknown model key: {model_key}")
        
        try:
            tokenizer = MarianTokenizer.from_pretrained(model_name)
            model = MarianMTModel.from_pretrained(model_name)
            model.to(self.device)
            model.eval()
            
            self.tokenizers[model_key] = tokenizer
            self.models[model_key] = model
            
            logger.info(f"Successfully loaded {model_key}: {model_name}")
        except Exception as e:
            logger.error(f"Failed to load {model_key}: {e}")
            raise
    
    def translate(self, text: str, source_lang: str, target_lang: str) -> Dict[str, any]:
        """
        Translate text between languages
        
        Args:
            text: Text to translate
            source_lang: Source language code
            target_lang: Target language code
            
        Returns:
            Dictionary with translation result and metadata
        """
        if not text or not text.strip():
            return {
                'translated_text': '',
                'source_lang': source_lang,
                'target_lang': target_lang,
                'confidence': 0.0,
                'method': 'empty_input'
            }
        
        # Handle Marwari translation (fallback approach)
        if source_lang == 'mwr':
            return self._translate_marwari(text, target_lang)
        
        # Handle direct model translation
        model_key = f"{source_lang}_to_{target_lang}"
        
        if model_key not in self.model_configs:
            # Try indirect translation via English
            return self._translate_via_english(text, source_lang, target_lang)
        
        try:
            # Load model if not already loaded
            if model_key not in self.models:
                self._load_model(model_key)
            
            # Perform translation
            translated_text = self._perform_translation(text, model_key)
            
            return {
                'translated_text': translated_text,
                'source_lang': source_lang,
                'target_lang': target_lang,
                'confidence': 0.85,
                'method': 'direct_translation',
                'model': model_key
            }
            
        except Exception as e:
            logger.error(f"Translation failed for {model_key}: {e}")
            return {
                'translated_text': text,  # Return original text
                'source_lang': source_lang,
                'target_lang': target_lang,
                'confidence': 0.0,
                'method': 'fallback_original',
                'error': str(e)
            }
    
    def _translate_marwari(self, text: str, target_lang: str) -> Dict[str, any]:
        """
        Translate Marwari text using phrase mapping and Hindi fallback
        
        Args:
            text: Marwari text
            target_lang: Target language
            
        Returns:
            Translation result
        """
        # First, convert Marwari phrases to Hindi
        hindi_text = self._marwari_to_hindi_phrases(text)
        
        # If target is Hindi, return the converted text
        if target_lang == 'hi':
            return {
                'translated_text': hindi_text,
                'source_lang': 'mwr',
                'target_lang': 'hi',
                'confidence': 0.75,
                'method': 'marwari_phrase_mapping',
                'intermediate_text': hindi_text
            }
        
        # If target is English, translate Hindi to English
        if target_lang == 'en':
            hindi_to_en_result = self.translate(hindi_text, 'hi', 'en')
            return {
                'translated_text': hindi_to_en_result['translated_text'],
                'source_lang': 'mwr',
                'target_lang': 'en',
                'confidence': hindi_to_en_result['confidence'] * 0.8,  # Reduce confidence for indirect
                'method': 'marwari_via_hindi',
                'intermediate_text': hindi_text
            }
        
        # For other targets, return Hindi conversion
        return {
            'translated_text': hindi_text,
            'source_lang': 'mwr',
            'target_lang': target_lang,
            'confidence': 0.6,
            'method': 'marwari_fallback_hindi',
            'intermediate_text': hindi_text
        }
    
    def _marwari_to_hindi_phrases(self, text: str) -> str:
        """Convert Marwari phrases to Hindi using phrase mapping"""
        converted_text = text
        
        # Apply phrase mappings
        for marwari_phrase, hindi_phrase in self.marwari_to_hindi_phrases.items():
            # Use word boundary matching to avoid partial replacements
            pattern = r'\b' + re.escape(marwari_phrase) + r'\b'
            converted_text = re.sub(pattern, hindi_phrase, converted_text)
        
        logger.info(f"Marwari to Hindi conversion: '{text}' -> '{converted_text}'")
        return converted_text
    
    def _translate_via_english(self, text: str, source_lang: str, target_lang: str) -> Dict[str, any]:
        """
        Translate via English as intermediate language
        
        Args:
            text: Source text
            source_lang: Source language
            target_lang: Target language
            
        Returns:
            Translation result
        """
        try:
            # First translate to English
            to_english_result = self.translate(text, source_lang, 'en')
            if to_english_result['confidence'] == 0.0:
                return to_english_result
            
            english_text = to_english_result['translated_text']
            
            # Then translate from English to target
            from_english_result = self.translate(english_text, 'en', target_lang)
            
            # Combine confidence scores
            combined_confidence = to_english_result['confidence'] * from_english_result['confidence'] * 0.9
            
            return {
                'translated_text': from_english_result['translated_text'],
                'source_lang': source_lang,
                'target_lang': target_lang,
                'confidence': combined_confidence,
                'method': 'via_english',
                'intermediate_text': english_text
            }
            
        except Exception as e:
            logger.error(f"Via-English translation failed: {e}")
            return {
                'translated_text': text,
                'source_lang': source_lang,
                'target_lang': target_lang,
                'confidence': 0.0,
                'method': 'fallback_original',
                'error': str(e)
            }
    
    def _perform_translation(self, text: str, model_key: str) -> str:
        """
        Perform actual translation using loaded model
        
        Args:
            text: Text to translate
            model_key: Model identifier
            
        Returns:
            Translated text
        """
        tokenizer = self.tokenizers[model_key]
        model = self.models[model_key]
        
        # Tokenize input
        inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=512)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        # Generate translation
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_length=512,
                num_beams=4,
                early_stopping=True,
                do_sample=False
            )
        
        # Decode output
        translated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        return translated_text.strip()
    
    def get_supported_pairs(self) -> List[Tuple[str, str]]:
        """Get list of supported translation pairs"""
        pairs = []
        
        # Direct model pairs
        for model_key in self.model_configs.keys():
            source, target = model_key.split('_to_')
            pairs.append((source, target))
        
        # Marwari pairs (via Hindi)
        pairs.extend([
            ('mwr', 'hi'),
            ('mwr', 'en')
        ])
        
        # Via-English pairs
        supported_langs = ['hi', 'mr', 'en']
        for source in supported_langs:
            for target in supported_langs:
                if source != target and (source, target) not in pairs:
                    pairs.append((source, target))
        
        return pairs
    
    def is_translation_needed(self, source_lang: str, target_lang: str) -> bool:
        """Check if translation is needed between languages"""
        return source_lang != target_lang
    
    def get_model_info(self) -> Dict[str, any]:
        """Get information about loaded models"""
        return {
            'loaded_models': list(self.models.keys()),
            'available_models': list(self.model_configs.keys()),
            'device': str(self.device),
            'marwari_phrases': len(self.marwari_to_hindi_phrases)
        }
