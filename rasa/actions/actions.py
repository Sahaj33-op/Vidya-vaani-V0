# Custom actions for the multilingual education chatbot
from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.forms import FormValidationAction
from rasa_sdk.types import DomainDict
import requests
import json
import logging

logger = logging.getLogger(__name__)

class ActionGetFeesInfo(Action):
    """Action to retrieve fee information"""
    
    def name(self) -> Text:
        return "action_get_fees_info"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        course_type = tracker.get_slot("course_type")
        department = tracker.get_slot("department")
        
        # Simulate database/API call for fee information
        fee_info = self._get_fee_structure(course_type, department)
        
        message = f"Fee Structure:\n{fee_info}"
        
        dispatcher.utter_message(text=message)
        return []
    
    def _get_fee_structure(self, course_type: Text = None, department: Text = None) -> Text:
        """Simulate fee structure retrieval"""
        base_fees = {
            "undergraduate": "₹50,000 per year",
            "postgraduate": "₹75,000 per year", 
            "diploma": "₹30,000 per year",
            "certificate": "₹15,000 per course"
        }
        
        if course_type and course_type.lower() in base_fees:
            fee = base_fees[course_type.lower()]
            if department:
                return f"• {course_type.title()} in {department.title()}: {fee}\n• Additional fees may apply for lab/library facilities"
            return f"• {course_type.title()}: {fee}\n• Additional fees may apply for hostel and other facilities"
        
        return "• Undergraduate: ₹50,000 per year\n• Postgraduate: ₹75,000 per year\n• Diploma: ₹30,000 per year\n• Additional fees may apply"

class ActionGetAdmissionInfo(Action):
    """Action to retrieve admission information"""
    
    def name(self) -> Text:
        return "action_get_admission_info"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        admission_info = """Admission Process:
1. Online application submission
2. Entrance exam (if applicable)
3. Document verification
4. Merit list publication
5. Fee payment and confirmation

Important Dates:
• Application deadline: July 31st
• Entrance exam: August 15th
• Merit list: August 25th
• Admission confirmation: September 5th

Required Documents:
• 10th & 12th mark sheets
• Transfer certificate
• Character certificate
• Passport size photographs
• Category certificate (if applicable)"""
        
        dispatcher.utter_message(text=admission_info)
        return []

class ActionGetTimetable(Action):
    """Action to retrieve timetable information"""
    
    def name(self) -> Text:
        return "action_get_timetable"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        course_type = tracker.get_slot("course_type")
        department = tracker.get_slot("department")
        
        timetable_info = f"""Class Schedule Information:

General Timings:
• Morning Batch: 8:00 AM - 1:00 PM
• Afternoon Batch: 2:00 PM - 7:00 PM

{f"For {course_type} in {department}:" if course_type and department else ""}
• Monday to Friday: Regular classes
• Saturday: Practical sessions/Seminars
• Sunday: Holiday

For detailed timetables, please:
1. Log into student portal
2. Contact your department office
3. Check notice board"""
        
        dispatcher.utter_message(text=timetable_info)
        return []

class ActionGetContactInfo(Action):
    """Action to retrieve contact information"""
    
    def name(self) -> Text:
        return "action_get_contact_info"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        contact_info = """Contact Information:

📞 Main Office: +91-XXX-XXX-XXXX
📧 Email: info@college.edu
🏢 Address: College Campus, City, State - 123456

Department Contacts:
• Admissions Office: Extension 101
• Academic Office: Extension 102
• Accounts Office: Extension 103
• Principal Office: Extension 104

Office Hours:
• Monday-Friday: 9:00 AM - 5:00 PM
• Saturday: 9:00 AM - 1:00 PM
• Sunday: Closed"""
        
        dispatcher.utter_message(text=contact_info)
        return []

class ActionSearchDocuments(Action):
    """Action to search through documents using RAG"""
    
    def name(self) -> Text:
        return "action_search_documents"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        user_message = tracker.latest_message.get('text')
        
        # This would integrate with the RAG system
        # For now, simulate document search
        search_results = self._search_knowledge_base(user_message)
        
        if search_results:
            response = f"Based on our documents:\n\n{search_results['answer']}\n\nSource: {search_results['source']}"
        else:
            response = "I couldn't find specific information about that in our documents. Would you like me to connect you with a human assistant?"
        
        dispatcher.utter_message(text=response)
        return []
    
    def _search_knowledge_base(self, query: Text) -> Dict[Text, Any]:
        """Simulate RAG document search"""
        # This would integrate with FAISS/Chroma vector database
        return {
            "answer": "This is a simulated answer from document search.",
            "source": "admission_guide.pdf - Page 2",
            "confidence": 0.85
        }

class ActionHandoffToHuman(Action):
    """Action to handoff conversation to human"""
    
    def name(self) -> Text:
        return "action_handoff_to_human"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        user_id = tracker.sender_id
        conversation_history = self._get_conversation_history(tracker)
        
        # Store handoff request (would integrate with ticketing system)
        handoff_id = self._create_handoff_request(user_id, conversation_history)
        
        message = f"""I'll connect you with a human assistant right away.

Your request ID: {handoff_id}
Expected wait time: 2-5 minutes

A staff member will join this conversation shortly to help you personally."""
        
        dispatcher.utter_message(text=message)
        return []
    
    def _get_conversation_history(self, tracker: Tracker) -> List[Dict]:
        """Extract conversation history for handoff"""
        history = []
        for event in tracker.events:
            if event.get('event') == 'user':
                history.append({
                    'sender': 'user',
                    'message': event.get('text'),
                    'timestamp': event.get('timestamp')
                })
            elif event.get('event') == 'bot':
                history.append({
                    'sender': 'bot', 
                    'message': event.get('text'),
                    'timestamp': event.get('timestamp')
                })
        return history[-10:]  # Last 10 messages
    
    def _create_handoff_request(self, user_id: Text, history: List[Dict]) -> Text:
        """Create handoff request in system"""
        # Would integrate with ticketing/CRM system
        import uuid
        handoff_id = str(uuid.uuid4())[:8].upper()
        
        # Log handoff request
        logger.info(f"Handoff request created: {handoff_id} for user: {user_id}")
        
        return handoff_id

class ActionDetectLanguage(Action):
    """Action to detect user's language preference"""
    
    def name(self) -> Text:
        return "action_detect_language"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        user_message = tracker.latest_message.get('text')
        detected_lang = self._detect_language(user_message)
        
        return [{"event": "slot", "name": "language_preference", "value": detected_lang}]
    
    def _detect_language(self, text: Text) -> Text:
        """Simple language detection"""
        # Check for Devanagari script (Hindi/Marathi)
        if any('\u0900' <= char <= '\u097F' for char in text):
            # Simple heuristic: if contains specific Marathi words
            marathi_words = ['आहे', 'आहेत', 'करतो', 'करते']
            if any(word in text for word in marathi_words):
                return 'mr'
            return 'hi'
        return 'en'

class ActionTranslateResponse(Action):
    """Action to translate responses based on user language"""
    
    def name(self) -> Text:
        return "action_translate_response"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        lang_pref = tracker.get_slot("language_preference")
        last_bot_message = None
        
        # Get last bot message
        for event in reversed(tracker.events):
            if event.get('event') == 'bot' and event.get('text'):
                last_bot_message = event.get('text')
                break
        
        if last_bot_message and lang_pref and lang_pref != 'en':
            translated_message = self._translate_text(last_bot_message, lang_pref)
            dispatcher.utter_message(text=f"[Translated to {lang_pref}]: {translated_message}")
        
        return []
    
    def _translate_text(self, text: Text, target_lang: Text) -> Text:
        """Simulate translation (would use MarianMT)"""
        # This would integrate with MarianMT translation models
        translations = {
            'hi': f"[Hindi translation of: {text[:50]}...]",
            'mr': f"[Marathi translation of: {text[:50]}...]"
        }
        return translations.get(target_lang, text)

class ActionDefaultFallback(Action):
    """Default fallback action"""
    
    def name(self) -> Text:
        return "action_default_fallback"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        message = """I'm sorry, I didn't understand that completely. 

I can help you with:
• Admission information
• Fee structure  
• Class timetables
• Contact details
• Course information

Could you please ask about one of these topics, or would you like me to connect you with a human assistant?"""
        
        dispatcher.utter_message(text=message)
        return []

class ValidateCourseInfoForm(FormValidationAction):
    """Validates the course info form"""
    
    def name(self) -> Text:
        return "validate_course_info_form"
    
    def validate_course_type(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> Dict[Text, Any]:
        """Validate course_type slot"""
        
        valid_courses = ["undergraduate", "postgraduate", "diploma", "certificate"]
        
        if slot_value and slot_value.lower() in valid_courses:
            return {"course_type": slot_value.lower()}
        else:
            dispatcher.utter_message(text="Please specify: undergraduate, postgraduate, diploma, or certificate")
            return {"course_type": None}
    
    def validate_department(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> Dict[Text, Any]:
        """Validate department slot"""
        
        if slot_value and len(slot_value) > 2:
            return {"department": slot_value}
        else:
            dispatcher.utter_message(text="Please specify your department (e.g., Computer Science, Mechanical Engineering)")
            return {"department": None}
