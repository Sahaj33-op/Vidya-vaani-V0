"""
RAG (Retrieval-Augmented Generation) Service
Provides document retrieval for context-aware responses
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class RAGService(ABC):
    """Abstract base class for RAG services"""

    @abstractmethod
    def search(self, query: str, top_k: int = 5, score_threshold: float = 0.3) -> List[Dict[str, Any]]:
        """Search for relevant documents"""
        pass

    @abstractmethod
    def add_documents(self, documents: List[Dict[str, Any]]) -> None:
        """Add documents to the index"""
        pass

    @abstractmethod
    def get_stats(self) -> Dict[str, Any]:
        """Get RAG system statistics"""
        pass


class MockRAGService(RAGService):
    """Mock RAG service for demo mode with pre-loaded educational content"""

    def __init__(self):
        self.documents = self._load_sample_documents()
        logger.info("MockRAGService initialized with sample documents")

    def _load_sample_documents(self) -> List[Dict[str, Any]]:
        """Load sample educational documents for demo mode"""
        return [
            {
                'doc_id': 'admission_guide',
                'chunk_id': 'admission_guide_1',
                'text': '''Admission Process and Requirements

Our college follows a comprehensive admission process. Application Process:
1. Online application submission through college portal
2. Upload required documents
3. Pay application fee of ₹500
4. Appear for entrance examination (if applicable)
5. Document verification and merit list publication

Required Documents: 10th and 12th standard mark sheets, transfer certificate,
character certificate, caste certificate (if applicable), income certificate,
passport size photographs, and Aadhar card copy.

Important Dates: Application start June 1st, deadline July 31st,
entrance exam August 15th, merit list August 25th.''',
                'metadata': {'type': 'admission', 'category': 'process'},
                'keywords': ['admission', 'apply', 'application', 'documents', 'requirements', 'प्रवेश']
            },
            {
                'doc_id': 'fee_structure',
                'chunk_id': 'fee_structure_1',
                'text': '''Fee Structure 2024-25

Undergraduate Programs:
- Engineering: ₹75,000 per year
- Arts & Science: ₹35,000 per year
- Commerce: ₹40,000 per year
- Computer Applications: ₹50,000 per year

Postgraduate Programs:
- M.Tech: ₹85,000 per year
- MBA: ₹90,000 per year
- M.Sc: ₹45,000 per year

Additional Fees: Admission fee ₹5,000 (one-time), Library fee ₹2,000/year,
Laboratory fee ₹3,000/year, Sports fee ₹1,000/year.

Payment Schedule: First installment 60% at admission,
Second installment 40% before December 31st.''',
                'metadata': {'type': 'fees', 'category': 'structure'},
                'keywords': ['fee', 'fees', 'cost', 'payment', 'tuition', 'फीस', 'scholarship']
            },
            {
                'doc_id': 'hostel_info',
                'chunk_id': 'hostel_info_1',
                'text': '''Hostel Facilities

We have separate hostels for boys and girls with modern amenities.

Boys Hostel: ₹35,000 per year
- AC and Non-AC rooms available
- WiFi connectivity
- 24/7 security

Girls Hostel: ₹40,000 per year
- Single and shared occupancy
- Common room with TV
- In-house warden

Mess Charges: ₹25,000 per year (includes breakfast, lunch, and dinner)
Hostel timings: Entry by 9:00 PM, Exit after 6:00 AM''',
                'metadata': {'type': 'facilities', 'category': 'hostel'},
                'keywords': ['hostel', 'accommodation', 'room', 'mess', 'stay', 'हॉस्टल']
            },
            {
                'doc_id': 'scholarship_info',
                'chunk_id': 'scholarship_info_1',
                'text': '''Scholarships and Financial Aid

Merit Scholarships:
- 90% and above: 50% fee waiver
- 80-89%: 30% fee waiver
- 75-79%: 15% fee waiver

Need-Based Scholarships:
- Family income below ₹2 lakh: Up to 40% fee waiver
- Family income ₹2-5 lakh: Up to 25% fee waiver

Sports Scholarships:
- National level: 50% fee waiver
- State level: 25% fee waiver
- District level: 15% fee waiver

Application Deadline: August 31st each year.
Contact: scholarship@college.edu''',
                'metadata': {'type': 'fees', 'category': 'scholarship'},
                'keywords': ['scholarship', 'financial aid', 'merit', 'concession', 'छात्रवृत्ति']
            },
            {
                'doc_id': 'courses_info',
                'chunk_id': 'courses_info_1',
                'text': '''Courses and Programs Offered

Undergraduate (UG) Programs:
- B.Tech (Computer Science, Electronics, Mechanical, Civil)
- B.Sc (Physics, Chemistry, Mathematics, Biology)
- B.Com (General, Honors)
- BBA (Business Administration)
- BCA (Computer Applications)

Postgraduate (PG) Programs:
- M.Tech (Computer Science, Electronics)
- M.Sc (Physics, Chemistry, Mathematics)
- MBA (Finance, Marketing, HR)
- MCA (Computer Applications)

Diploma Programs:
- Diploma in Engineering (3 years)
- Diploma in Computer Applications (1 year)

Duration: UG programs 3-4 years, PG programs 2 years.''',
                'metadata': {'type': 'courses', 'category': 'programs'},
                'keywords': ['course', 'program', 'degree', 'btech', 'mtech', 'bsc', 'msc', 'mba', 'कोर्स']
            },
            {
                'doc_id': 'placement_info',
                'chunk_id': 'placement_info_1',
                'text': '''Placement Cell and Career Services

Our Training and Placement Cell helps students with campus placements.

Placement Statistics (2023-24):
- Overall placement rate: 85%
- Highest package: ₹25 LPA
- Average package: ₹6.5 LPA
- Number of companies: 150+

Top Recruiters: TCS, Infosys, Wipro, Cognizant, Accenture, Amazon,
Microsoft, Google, IBM, Capgemini, Tech Mahindra, HCL.

Services Offered:
- Resume building workshops
- Mock interviews
- Soft skills training
- Technical training
- Industry internships

Contact: placement@college.edu, Office: Block A, Room 101''',
                'metadata': {'type': 'placement', 'category': 'career'},
                'keywords': ['placement', 'job', 'career', 'salary', 'package', 'recruiter', 'प्लेसमेंट']
            },
            {
                'doc_id': 'contact_info',
                'chunk_id': 'contact_info_1',
                'text': '''Contact Information

Main Office:
Phone: +91-1234567890
Email: info@college.edu
Address: College Campus, Main Road, City - 123456

Admission Office:
Phone: +91-1234567891
Email: admissions@college.edu
Timing: Monday-Saturday, 9:00 AM - 5:00 PM

Student Helpdesk:
Phone: +91-1234567892
Email: helpdesk@college.edu
Available: 24/7

Principal's Office:
Email: principal@college.edu
Appointment: Through official request only''',
                'metadata': {'type': 'contact', 'category': 'office'},
                'keywords': ['contact', 'phone', 'email', 'address', 'office', 'संपर्क']
            },
            {
                'doc_id': 'exam_info',
                'chunk_id': 'exam_info_1',
                'text': '''Examination System

Examination Pattern:
- Internal Assessment: 30 marks (assignments, quizzes, mid-terms)
- External Examination: 70 marks (end semester)
- Practical Examination: As per course requirements

Grading System (10-point CGPA):
- O (Outstanding): 10
- A+ (Excellent): 9
- A (Very Good): 8
- B+ (Good): 7
- B (Above Average): 6
- C (Average): 5
- P (Pass): 4
- F (Fail): 0

Attendance Requirement: Minimum 75% attendance required.
Supplementary Exams: Available for failed subjects within 6 months.''',
                'metadata': {'type': 'academic', 'category': 'examination'},
                'keywords': ['exam', 'examination', 'grade', 'marks', 'cgpa', 'result', 'परीक्षा']
            },
            {
                'doc_id': 'library_info',
                'chunk_id': 'library_info_1',
                'text': '''Library and Learning Resources

Central Library:
- Collection: 50,000+ books, 100+ journals
- Digital Library: Access to e-books and online journals
- Reading Room: 200 seating capacity
- Computer Lab: 50 computers with internet

Timings:
- Weekdays: 8:00 AM - 10:00 PM
- Weekends: 9:00 AM - 6:00 PM
- Exam period: Extended hours till midnight

Borrowing Rules:
- UG students: 4 books for 14 days
- PG students: 6 books for 21 days
- Faculty: 10 books for 30 days

Fine: ₹5 per day for overdue books.
Contact: library@college.edu''',
                'metadata': {'type': 'facilities', 'category': 'library'},
                'keywords': ['library', 'book', 'reading', 'study', 'पुस्तकालय']
            },
            {
                'doc_id': 'timetable_info',
                'chunk_id': 'timetable_info_1',
                'text': '''Class Schedule and Timetable

College Timings:
- Morning Session: 8:00 AM - 1:00 PM
- Afternoon Session: 2:00 PM - 5:00 PM
- Saturday: 9:00 AM - 1:00 PM (workshops/labs)

Class Duration: 50 minutes per lecture
Break: 10:30 AM - 10:45 AM (morning tea), 1:00 PM - 2:00 PM (lunch)

Timetable Access:
- Available on student portal
- Department notice boards
- Mobile app notifications

Changes: Notified 24 hours in advance via SMS and email.
Contact: academics@college.edu for queries.''',
                'metadata': {'type': 'academic', 'category': 'schedule'},
                'keywords': ['timetable', 'schedule', 'timing', 'class', 'lecture', 'समय']
            }
        ]

    def search(self, query: str, top_k: int = 5, score_threshold: float = 0.3) -> List[Dict[str, Any]]:
        """Simple keyword-based search for demo mode"""
        query_lower = query.lower()
        results = []

        for doc in self.documents:
            score = 0.0
            keywords = doc.get('keywords', [])

            # Check keyword matches
            for keyword in keywords:
                if keyword.lower() in query_lower:
                    score += 0.3

            # Check text content
            text_lower = doc['text'].lower()
            query_words = query_lower.split()
            for word in query_words:
                if len(word) > 3 and word in text_lower:
                    score += 0.1

            if score >= score_threshold:
                results.append({
                    'text': doc['text'],
                    'doc_id': doc['doc_id'],
                    'chunk_id': doc['chunk_id'],
                    'metadata': doc['metadata'],
                    'score': min(score, 1.0)
                })

        # Sort by score and return top_k
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:top_k]

    def add_documents(self, documents: List[Dict[str, Any]]) -> None:
        """Add documents to the mock store"""
        for doc in documents:
            self.documents.append({
                'doc_id': doc.get('doc_id', f'doc_{len(self.documents)}'),
                'chunk_id': doc.get('chunk_id', f'chunk_{len(self.documents)}'),
                'text': doc.get('content', doc.get('text', '')),
                'metadata': doc.get('metadata', {}),
                'keywords': doc.get('keywords', [])
            })
        logger.info(f"Added {len(documents)} documents to MockRAGService")

    def get_stats(self) -> Dict[str, Any]:
        """Get mock RAG statistics"""
        return {
            'total_chunks': len(self.documents),
            'index_size': len(self.documents),
            'embedding_dimension': 384,
            'unique_documents': len(set(d['doc_id'] for d in self.documents)),
            'mode': 'demo'
        }


class FAISSRAGService(RAGService):
    """Production RAG service using FAISS vector store"""

    def __init__(self, index_path: str = "data/faiss_index"):
        # Lazy import to avoid loading heavy dependencies in demo mode
        from retriever.embeddings import EmbeddingService
        from retriever.vector_store import FAISSVectorStore
        from retriever.document_processor import DocumentProcessor

        self.embedding_service = EmbeddingService()
        self.vector_store = FAISSVectorStore(self.embedding_service, index_path)
        self.document_processor = DocumentProcessor(chunk_size=500, chunk_overlap=50)

        # Load sample data if index is empty
        if self.vector_store.get_stats()['total_chunks'] == 0:
            self._load_sample_data()

        logger.info("FAISSRAGService initialized")

    def search(self, query: str, top_k: int = 5, score_threshold: float = 0.3) -> List[Dict[str, Any]]:
        """Search for relevant documents using FAISS"""
        results = self.vector_store.search(query, top_k, score_threshold)

        # Format results consistently
        formatted_results = []
        for result in results:
            formatted_results.append({
                'text': result['text'],
                'doc_id': result['doc_id'],
                'chunk_id': result['chunk_id'],
                'metadata': result['metadata'],
                'score': result['score']
            })

        return formatted_results

    def add_documents(self, documents: List[Dict[str, Any]]) -> None:
        """Add documents to the FAISS index"""
        from retriever.document_processor import DocumentChunk

        all_chunks = []
        for doc in documents:
            content = doc.get('content', doc.get('text', ''))
            doc_id = doc.get('doc_id', f'doc_{len(all_chunks)}')
            metadata = doc.get('metadata', {})

            # Process into chunks
            chunks = self.document_processor._chunk_text(content, doc_id)
            for chunk in chunks:
                chunk.metadata.update(metadata)
            all_chunks.extend(chunks)

        self.vector_store.add_documents(all_chunks)
        logger.info(f"Added {len(all_chunks)} chunks to FAISSRAGService")

    def get_stats(self) -> Dict[str, Any]:
        """Get FAISS RAG statistics"""
        stats = self.vector_store.get_stats()
        stats['mode'] = 'faiss'
        return stats

    def _load_sample_data(self) -> None:
        """Load sample educational data"""
        from retriever.rag_pipeline import RAGPipeline

        # Use the existing RAG pipeline's sample data loading
        pipeline = RAGPipeline.__new__(RAGPipeline)
        pipeline.document_processor = self.document_processor
        pipeline.vector_store = self.vector_store
        pipeline.embedding_service = self.embedding_service
        pipeline._load_sample_data()
