import os
from abc import ABC, abstractmethod
from app.core.config import settings
from typing import List, Any, Optional

class LLMService(ABC):
    @abstractmethod
    def generate_response(self, prompt: str, context: Optional[List[Any]] = None) -> str:
        pass

class MockLLMService(LLMService):
    def generate_response(self, prompt: str, context: Optional[List[Any]] = None) -> str:
        if context and len(context) > 0:
            return f"Mock response with context to: {prompt}"
        return f"Mock response to: {prompt}"

class GeminiLLMService(LLMService):
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        # In a real implementation, you would initialize the Gemini client here

    def generate_response(self, prompt: str, context: Optional[List[Any]] = None) -> str:
        if not self.api_key:
            return "Gemini API key is not configured."
        
        # Prepare context for RAG if available
        context_text = ""
        if context and len(context) > 0:
            context_text = "\n\nRelevant context:\n" + "\n".join([str(doc) for doc in context])
            
        # Construct the full prompt with context
        full_prompt = prompt + context_text
            
        # Placeholder for actual Gemini API call
        return f"Gemini (using key: {self.api_key[-4:]}) response to: {full_prompt}"
