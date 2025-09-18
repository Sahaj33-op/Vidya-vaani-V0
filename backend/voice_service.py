"""
Voice processing service with OpenAI Whisper integration
Handles speech-to-text and text-to-speech functionality
"""

import os
import io
import base64
import tempfile
import logging
from typing import Dict, Any, Optional
import whisper
import speech_recognition as sr
from pydub import AudioSegment
from pydub.utils import which

logger = logging.getLogger(__name__)

class VoiceService:
    """Service for voice processing with Whisper STT"""
    
    def __init__(self):
        """Initialize voice service"""
        self.whisper_model = None
        self.recognizer = sr.Recognizer()
        
        # Load Whisper model (start with small model for faster processing)
        self._load_whisper_model()
        
        # Check for ffmpeg (required for audio processing)
        self._check_dependencies()
    
    def _load_whisper_model(self, model_size: str = "base"):
        """Load Whisper model for speech recognition"""
        try:
            logger.info(f"Loading Whisper model: {model_size}")
            self.whisper_model = whisper.load_model(model_size)
            logger.info("Whisper model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            self.whisper_model = None
    
    def _check_dependencies(self):
        """Check for required dependencies"""
        if which("ffmpeg") is None:
            logger.warning("ffmpeg not found. Audio conversion may not work properly.")
            logger.info("Install ffmpeg: https://ffmpeg.org/download.html")
    
    def transcribe_audio(self, audio_data: str, language: str = None) -> Dict[str, Any]:
        """
        Transcribe audio to text using Whisper
        
        Args:
            audio_data: Base64 encoded audio data
            language: Target language code (optional)
            
        Returns:
            Dictionary with transcription results
        """
        if not audio_data:
            return {
                'success': False,
                'error': 'No audio data provided',
                'method': 'error'
            }
        
        try:
            # Decode base64 audio data
            audio_bytes = base64.b64decode(audio_data)
            
            # Create temporary file for audio processing
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                temp_file.write(audio_bytes)
                temp_file_path = temp_file.name
            
            try:
                # Try Whisper first (more accurate)
                if self.whisper_model:
                    return self._transcribe_with_whisper(temp_file_path, language)
                else:
                    # Fallback to SpeechRecognition
                    return self._transcribe_with_speech_recognition(temp_file_path, language)
                    
            finally:
                # Clean up temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    
        except Exception as e:
            logger.error(f"Audio transcription error: {e}")
            return {
                'success': False,
                'error': f'Transcription failed: {str(e)}',
                'method': 'error'
            }
    
    def _transcribe_with_whisper(self, audio_file_path: str, language: str = None) -> Dict[str, Any]:
        """Transcribe using OpenAI Whisper"""
        try:
            # Language mapping for Whisper
            whisper_language_map = {
                'en': 'english',
                'hi': 'hindi',
                'mr': 'marathi',
                'mwr': 'hindi',  # Fallback to Hindi for Marwari
            }
            
            whisper_language = whisper_language_map.get(language, 'english') if language else None
            
            # Transcribe with Whisper
            result = self.whisper_model.transcribe(
                audio_file_path,
                language=whisper_language,
                task='transcribe'
            )
            
            transcribed_text = result['text'].strip()
            detected_language = result.get('language', language or 'en')
            
            # Calculate confidence based on Whisper's segments
            segments = result.get('segments', [])
            if segments:
                avg_probability = sum(segment.get('avg_logprob', 0) for segment in segments) / len(segments)
                # Convert log probability to confidence score (0-1)
                confidence = max(0.1, min(1.0, (avg_probability + 1) / 2 + 0.5))
            else:
                confidence = 0.8  # Default confidence
            
            return {
                'success': True,
                'transcribed_text': transcribed_text,
                'language_detected': detected_language,
                'confidence': confidence,
                'method': 'whisper',
                'model_size': 'base',
                'segments_count': len(segments)
            }
            
        except Exception as e:
            logger.error(f"Whisper transcription error: {e}")
            # Fallback to SpeechRecognition
            return self._transcribe_with_speech_recognition(audio_file_path, language)
    
    def _transcribe_with_speech_recognition(self, audio_file_path: str, language: str = None) -> Dict[str, Any]:
        """Fallback transcription using SpeechRecognition library"""
        try:
            # Convert audio to wav format if needed
            audio = AudioSegment.from_file(audio_file_path)
            
            # Ensure audio is in correct format for speech recognition
            audio = audio.set_frame_rate(16000).set_channels(1)
            
            # Save as wav for speech recognition
            wav_path = audio_file_path.replace('.wav', '_sr.wav')
            audio.export(wav_path, format='wav')
            
            try:
                with sr.AudioFile(wav_path) as source:
                    audio_data = self.recognizer.record(source)
                
                # Language mapping for Google Speech Recognition
                sr_language_map = {
                    'en': 'en-US',
                    'hi': 'hi-IN',
                    'mr': 'mr-IN',
                    'mwr': 'hi-IN',  # Fallback to Hindi
                }
                
                sr_language = sr_language_map.get(language, 'en-US')
                
                # Try Google Speech Recognition
                text = self.recognizer.recognize_google(audio_data, language=sr_language)
                
                return {
                    'success': True,
                    'transcribed_text': text,
                    'language_detected': language or 'en',
                    'confidence': 0.7,  # Default confidence for SR
                    'method': 'speech_recognition_google',
                    'fallback_reason': 'whisper_unavailable'
                }
                
            finally:
                # Clean up temporary SR file
                if os.path.exists(wav_path):
                    os.unlink(wav_path)
                    
        except sr.UnknownValueError:
            return {
                'success': False,
                'error': 'Could not understand audio',
                'method': 'speech_recognition_error'
            }
        except sr.RequestError as e:
            logger.error(f"Speech Recognition service error: {e}")
            return {
                'success': False,
                'error': f'Speech recognition service error: {str(e)}',
                'method': 'speech_recognition_service_error'
            }
        except Exception as e:
            logger.error(f"Speech recognition fallback error: {e}")
            return {
                'success': False,
                'error': f'Speech recognition failed: {str(e)}',
                'method': 'speech_recognition_fallback_error'
            }
    
    def process_voice_command(self, audio_data: str, language: str = 'en') -> Dict[str, Any]:
        """
        Process voice command with automatic language detection
        
        Args:
            audio_data: Base64 encoded audio
            language: Expected language
            
        Returns:
            Processing result with transcription and metadata
        """
        # First, transcribe the audio
        transcription_result = self.transcribe_audio(audio_data, language)
        
        if not transcription_result.get('success'):
            return transcription_result
        
        transcribed_text = transcription_result.get('transcribed_text', '')
        
        # Add voice command processing logic here
        # This could include intent detection, command parsing, etc.
        
        return {
            **transcription_result,
            'processed_text': transcribed_text,
            'command_type': 'chat_message',  # Default command type
            'requires_response': True
        }
    
    def get_service_info(self) -> Dict[str, Any]:
        """Get information about the voice service"""
        return {
            'whisper_available': self.whisper_model is not None,
            'speech_recognition_available': True,
            'supported_languages': ['en', 'hi', 'mr', 'mwr'],
            'whisper_model_loaded': bool(self.whisper_model),
            'dependencies': {
                'ffmpeg': which("ffmpeg") is not None,
                'whisper': self.whisper_model is not None
            }
        }
    
    def validate_audio_format(self, audio_data: str) -> bool:
        """Validate audio data format"""
        try:
            audio_bytes = base64.b64decode(audio_data)
            return len(audio_bytes) > 0
        except Exception:
            return False

# Global voice service instance
voice_service = VoiceService()

def get_voice_service() -> VoiceService:
    """Get the global voice service instance"""
    return voice_service