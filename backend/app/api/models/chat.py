from pydantic import BaseModel
from typing import List, Optional

class ChatRequest(BaseModel):
    message: str
    language: Optional[str] = None

class RetrievedDocument(BaseModel):
    content: str
    source_id: str

class ChatResponse(BaseModel):
    reply: str
    confidence: float = 1.0
    source_ids: List[str] = []
    action: str = "answer:llm"
    translated: bool = False
    original_language: Optional[str] = None
