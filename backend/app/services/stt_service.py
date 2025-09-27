from abc import ABC, abstractmethod

class STTService(ABC):
    @abstractmethod
    def transcribe_audio(self, audio_data: bytes) -> str:
        pass

class MockSTTService(STTService):
    def transcribe_audio(self, audio_data: bytes) -> str:
        return "Mock transcription of audio data"

class RealSTTService(STTService):
    def transcribe_audio(self, audio_data: bytes) -> str:
        # Implement actual STT service integration (e.g., Google Cloud Speech-to-Text, OpenAI Whisper)
        return "Real STT transcription of audio data"
