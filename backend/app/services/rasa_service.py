import httpx
from typing import Dict, Any, List
from app.core.config import settings

class RasaNLUService:
    """Service for interacting with Rasa NLU for intent detection and entity extraction."""
    
    def __init__(self, rasa_url: str = None):
        self.rasa_url = rasa_url or settings.RASA_API_URL or "http://localhost:5005"
    
    async def parse_message(self, text: str, language: str = "en") -> Dict[str, Any]:
        """
        Send a message to Rasa NLU for intent and entity extraction.
        
        Args:
            text: The text message to parse
            language: The language code (default: "en")
            
        Returns:
            Dict containing intent and entities
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.rasa_url}/model/parse",
                    json={"text": text, "language": language},
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    print(f"Rasa NLU request failed with status {response.status_code}")
                    return {"intent": "general_query", "entities": []}
                
                data = response.json()
                
                # Extract the most confident intent
                best_intent = "general_query"
                max_confidence = 0
                
                if data.get("intent") and data["intent"].get("name"):
                    best_intent = data["intent"]["name"]
                    max_confidence = data["intent"]["confidence"]
                
                # If confidence is too low, fallback to general query
                if max_confidence < 0.5:
                    best_intent = "general_query"
                    
                return {
                    "intent": best_intent,
                    "entities": data.get("entities", []),
                    "confidence": max_confidence
                }
        except Exception as e:
            print(f"Error calling Rasa NLU: {e}")
            return {"intent": "general_query", "entities": [], "confidence": 0.0}

# Mock implementation for testing without Rasa
class MockRasaNLUService(RasaNLUService):
    """Mock implementation of Rasa NLU service for testing."""
    
    async def parse_message(self, text: str, language: str = "en") -> Dict[str, Any]:
        """
        Mock implementation that returns predefined intents based on keywords.
        
        Args:
            text: The text message to parse
            language: The language code (ignored in mock)
            
        Returns:
            Dict containing mock intent and entities
        """
        text_lower = text.lower()
        
        # Simple keyword-based intent detection
        if "help" in text_lower:
            return {"intent": "request_help", "entities": [], "confidence": 0.9}
        elif "human" in text_lower or "person" in text_lower or "agent" in text_lower:
            return {"intent": "request_human_handoff", "entities": [], "confidence": 0.9}
        elif "admission" in text_lower or "enroll" in text_lower:
            return {"intent": "admission_inquiry", "entities": [], "confidence": 0.8}
        elif "fee" in text_lower or "payment" in text_lower or "cost" in text_lower:
            return {"intent": "fee_inquiry", "entities": [], "confidence": 0.8}
        elif "course" in text_lower or "program" in text_lower or "degree" in text_lower:
            return {"intent": "course_inquiry", "entities": [], "confidence": 0.8}
        else:
            return {"intent": "general_query", "entities": [], "confidence": 0.6}