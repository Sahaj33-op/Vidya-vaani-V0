import os
from abc import ABC, abstractmethod
from app.core.config import settings

class LLMService(ABC):
    @abstractmethod
    def generate_response(self, prompt: str) -> str:
        pass

class MockLLMService(LLMService):
    def generate_response(self, prompt: str) -> str:
        return f"Mock response to: {prompt}"

class GeminiLLMService(LLMService):
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        # In a real implementation, you would initialize the Gemini client here

    def generate_response(self, prompt: str) -> str:
        if not self.api_key:
            return "Gemini API key is not configured."
        # Placeholder for actual Gemini API call
        return f"Gemini (using key: {self.api_key[-4:]}) response to: {prompt}"
