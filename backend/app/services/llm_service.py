import logging
import os
from abc import ABC, abstractmethod
from typing import Any, List, Optional

import google.generativeai as genai

from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMService(ABC):
    @abstractmethod
    def generate_response(
        self, prompt: str, context: Optional[List[Any]] = None
    ) -> str:
        pass


class MockLLMService(LLMService):
    """Mock LLM service for demo mode - provides keyword-based responses."""

    def __init__(self):
        # Keyword-based response templates for education context
        self.responses = {
            "admission": "Our college admissions are open from January to March. You can apply online through our portal or visit the admissions office. Required documents include academic transcripts, ID proof, and passport-sized photographs.",
            "fee": "The tuition fees vary by program. Undergraduate programs range from ₹50,000-1,00,000 per year. Postgraduate programs range from ₹75,000-1,50,000 per year. Scholarships are available for meritorious students.",
            "course": "We offer programs in Engineering, Commerce, Arts, and Science. Popular courses include Computer Science, Electronics, Business Administration, and Data Science. Each program has both regular and honors tracks.",
            "scholarship": "We offer merit-based scholarships covering 25-100% of tuition fees. Sports scholarships and need-based financial aid are also available. Applications open in June each year.",
            "hostel": "Hostel facilities are available for both boys and girls. Rooms are air-conditioned with WiFi. The monthly rent is ₹8,000-12,000 including meals. Apply early as seats are limited.",
            "exam": "Examinations are held at the end of each semester. The grading system follows CGPA on a 10-point scale. Minimum 75% attendance is required to appear for exams.",
            "placement": "Our placement cell has tie-ups with 200+ companies. Average placement rate is 85%. Top recruiters include TCS, Infosys, Wipro, and Amazon.",
            "library": "The central library is open from 8 AM to 10 PM on weekdays. We have over 50,000 books and access to online journals. Student ID is required for entry.",
            "contact": "You can reach us at admissions@college.edu or call +91-1234567890. Office hours are 9 AM to 5 PM, Monday to Saturday.",
        }
        self.default_response = "Thank you for your question. For specific information about our college, please visit our website or contact the administration office at admissions@college.edu."

    def generate_response(
        self, prompt: str, context: Optional[List[Any]] = None
    ) -> str:
        prompt_lower = prompt.lower()

        # Check for keyword matches
        for keyword, response in self.responses.items():
            if keyword in prompt_lower:
                if context and len(context) > 0:
                    return f"{response}\n\nAdditional context from our documents: {context[0][:200]}..."
                return response

        # Handle greetings
        greetings = ["hello", "hi", "hey", "namaste", "good morning", "good afternoon"]
        if any(greet in prompt_lower for greet in greetings):
            return "Hello! Welcome to Vidya Vaani. I'm here to help with your college-related queries. You can ask me about admissions, fees, courses, scholarships, and more. How can I assist you today?"

        return self.default_response


class GeminiLLMService(LLMService):
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if not self.api_key or self.api_key == "your_gemini_api_key_here":
            raise ValueError("GEMINI_API_KEY is not properly configured in .env file")

        # Configure Gemini SDK
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel("gemini-2.5-flash-lite")

        # Education-focused system prompt
        self.system_prompt = """You are Vidya Vaani, a helpful and knowledgeable education assistant for colleges and universities.

Your role:
- Answer questions about admissions, courses, fees, exams, scholarships, and campus facilities
- Provide accurate, concise, and helpful information
- Be polite and professional
- If you don't know something, admit it honestly
- Keep responses under 150 words unless more detail is specifically requested

Context: You're assisting students and parents with college-related queries. Always prioritize clarity and helpfulness."""

    def generate_response(
        self, prompt: str, context: Optional[List[Any]] = None
    ) -> str:
        try:
            # Prepare context for RAG if available
            context_text = ""
            if context and len(context) > 0:
                context_text = (
                    "\n\nRelevant information from our knowledge base:\n"
                    + "\n".join([str(doc) for doc in context[:3]])
                )  # Limit to top 3 for token efficiency

            # Construct the full prompt
            full_prompt = f"""{self.system_prompt}

Student Question: {prompt}
{context_text}

Answer:"""

            # Generate response using Gemini
            response = self.model.generate_content(full_prompt)

            if not response or not response.text:
                return "I apologize, but I'm having trouble generating a response right now. Please try again."

            return response.text.strip()

        except Exception as e:
            logger.error(f"Error generating Gemini response: {e}", exc_info=True)
            return "I apologize, but I'm experiencing technical difficulties. Please try asking your question again or contact the college office for assistance."
