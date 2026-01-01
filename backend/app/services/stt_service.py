import base64
import io
import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class STTService(ABC):
    @abstractmethod
    def transcribe_audio(self, audio_data: bytes) -> str:
        pass


class MockSTTService(STTService):
    def transcribe_audio(self, audio_data: bytes) -> str:
        return "Mock transcription of audio data"


class RealSTTService(STTService):
    """
    Real STT service using Google Cloud Speech-to-Text
    Supports multilingual and code-mixed (bilingual) speech
    """

    def __init__(self):
        try:
            # Try to import Google Cloud Speech
            from google.cloud import speech_v1p1beta1 as speech

            self.client = speech.SpeechClient()
            self.use_google = True
            logger.info("Initialized Google Cloud Speech-to-Text")
        except Exception as e:
            logger.warning(f"Google Cloud Speech not available: {e}. Using fallback.")
            self.use_google = False

    def transcribe_audio(self, audio_data: bytes) -> str:
        """
        Transcribe audio with automatic language detection
        Supports bilingual/code-mixed speech (Hinglish, etc.)
        """
        if not self.use_google:
            return "Speech transcription service not configured. Please set up Google Cloud credentials."

        try:
            from google.cloud import speech_v1p1beta1 as speech

            # Configure recognition with multilingual support
            config = speech.RecognitionConfig(
                encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
                sample_rate_hertz=16000,
                # Enable automatic language detection with common Indian languages
                language_code="en-IN",  # Primary language
                alternative_language_codes=["hi-IN", "mr-IN"],  # Hindi, Marathi
                enable_automatic_punctuation=True,
                enable_word_time_offsets=False,
                model="latest_long",  # Use latest model for better accuracy
            )

            audio = speech.RecognitionAudio(content=audio_data)

            # Perform synchronous recognition
            response = self.client.recognize(config=config, audio=audio)

            # Extract transcription
            if response.results:
                transcript = " ".join(
                    [result.alternatives[0].transcript for result in response.results]
                )
                logger.info(f"Transcribed: {transcript[:100]}...")
                return transcript
            else:
                logger.warning("No transcription results returned")
                return "Unable to transcribe audio. Please try again."

        except Exception as e:
            logger.error(f"Speech transcription error: {e}", exc_info=True)
            return f"Transcription error: {str(e)}"
