"""
RAG (Retrieval-Augmented Generation) pipeline
Combines document retrieval with response generation
"""

import os
import json
from typing import List, Dict, Any, Optional, Tuple
import logging

from .vector_store import FAISSVectorStore
from .embeddings import EmbeddingService
from .document_processor import DocumentProcessor, DocumentChunk

logger = logging.getLogger(__name__)

class RAGPipeline:
    """Complete RAG pipeline for question answering"""
    
    def __init__(self, 
                 embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2",
                 index_path: str = "data/faiss_index",
                 chunk_size: int = 500,
                 chunk_overlap: int = 50):
        """
        Initialize RAG pipeline
        
        Args:
            embedding_model: SentenceTransformer model name
            index_path: Path for FAISS index storage
            chunk_size: Document chunk size in tokens
            chunk_overlap: Overlap between chunks
        """
        self.embedding_service = EmbeddingService(embedding_model)
        self.vector_store = FAISSVectorStore(self.embedding_service, index_path)
        self.document_processor = DocumentProcessor(chunk_size, chunk_overlap)
        
        # Load sample data if index is empty
        if self.vector_store.get_stats()['total_chunks'] == 0:
            self._load_sample_data()
    
    def index_documents(self, documents: List[Dict[str, Any]]) -> None:
        """
        Index documents for retrieval
        
        Args:
            documents: List of document dictionaries with 'content', 'doc_id', 'metadata'
        """
        all_chunks = []
        
        for doc in documents:
            content = doc.get('content', '')
            doc_id = doc.get('doc_id', f"doc_{len(all_chunks)}")
            metadata = doc.get('metadata', {})
            
            # Process document into chunks
            if doc.get('type') == 'faq':
                # Handle FAQ format
                faq_data = doc.get('faq_data', [])
                chunks = self.document_processor.process_faq_data(faq_data)
            else:
                # Handle regular text
                chunks = self.document_processor._chunk_text(content, doc_id)
                # Add metadata to chunks
                for chunk in chunks:
                    chunk.metadata.update(metadata)
            
            all_chunks.extend(chunks)
        
        # Add to vector store
        self.vector_store.add_documents(all_chunks)
        logger.info(f"Indexed {len(all_chunks)} chunks from {len(documents)} documents")
    
    def query(self, 
              question: str, 
              top_k: int = 5, 
              score_threshold: float = 0.3,
              language: str = 'en') -> Dict[str, Any]:
        """
        Query the RAG system
        
        Args:
            question: User question
            top_k: Number of documents to retrieve
            score_threshold: Minimum similarity score
            language: Query language
            
        Returns:
            Dictionary with answer, sources, and confidence
        """
        logger.info(f"Processing query: {question[:100]}...")
        
        # Retrieve relevant documents
        search_results = self.vector_store.search(
            query=question,
            top_k=top_k,
            score_threshold=score_threshold
        )
        
        if not search_results:
            return {
                'answer': "I couldn't find relevant information to answer your question. Would you like me to connect you with a human assistant?",
                'sources': [],
                'confidence': 0.0,
                'retrieved_chunks': []
            }
        
        # Generate response using retrieved context
        response = self._generate_response(question, search_results, language)
        
        return response
    
    def _generate_response(self, 
                          question: str, 
                          search_results: List[Dict[str, Any]], 
                          language: str) -> Dict[str, Any]:
        """
        Generate response using retrieved documents
        
        Args:
            question: User question
            search_results: Retrieved document chunks
            language: Response language
            
        Returns:
            Response dictionary
        """
        # Extract context from search results
        context_chunks = []
        sources = []
        
        for result in search_results:
            chunk = result['chunk']
            context_chunks.append(chunk.text)
            
            # Create source reference
            source_ref = f"{chunk.doc_id}"
            if chunk.page_num:
                source_ref += f":page_{chunk.page_num}"
            elif 'chunk_index' in chunk.metadata:
                source_ref += f":section_{chunk.metadata['chunk_index']}"
            
            sources.append(source_ref)
        
        # For MVP, use template-based response generation
        # In production, this would use a language model
        answer = self._template_based_generation(question, context_chunks, language)
        
        # Calculate confidence based on search scores
        avg_score = sum(r['score'] for r in search_results) / len(search_results)
        confidence = min(avg_score * 1.2, 1.0)  # Scale and cap at 1.0
        
        return {
            'answer': answer,
            'sources': sources[:3],  # Limit to top 3 sources
            'confidence': confidence,
            'retrieved_chunks': [r['text'][:200] + '...' for r in search_results[:2]]  # Preview chunks
        }
    
    def _template_based_generation(self, 
                                  question: str, 
                                  context_chunks: List[str], 
                                  language: str) -> str:
        """
        Generate response using templates (MVP approach)
        
        Args:
            question: User question
            context_chunks: Retrieved context
            language: Response language
            
        Returns:
            Generated answer
        """
        # Combine context
        context = '\n\n'.join(context_chunks[:3])  # Use top 3 chunks
        
        # Simple template-based generation
        if 'fee' in question.lower() or 'cost' in question.lower() or 'फीस' in question:
            if any('₹' in chunk or 'fee' in chunk.lower() for chunk in context_chunks):
                # Extract fee information from context
                fee_info = self._extract_fee_info(context)
                return f"Based on our records:\n\n{fee_info}\n\nFor the most current fee structure, please contact the admissions office."
        
        elif 'admission' in question.lower() or 'apply' in question.lower() or 'प्रवेश' in question:
            if any('admission' in chunk.lower() or 'application' in chunk.lower() for chunk in context_chunks):
                return f"Here's the admission information:\n\n{context[:500]}...\n\nFor detailed guidance, please visit the admissions office."
        
        elif 'timetable' in question.lower() or 'schedule' in question.lower() or 'समय' in question:
            return f"Class schedule information:\n\n{context[:400]}...\n\nFor your specific timetable, please check the student portal or contact your department."
        
        elif 'contact' in question.lower() or 'phone' in question.lower() or 'संपर्क' in question:
            return f"Contact information:\n\n{context[:400]}...\n\nOffice hours: Monday-Friday, 9:00 AM - 5:00 PM"
        
        # Generic response with context
        return f"Based on the available information:\n\n{context[:500]}...\n\nIf you need more specific details, please contact our office or ask a more specific question."
    
    def _extract_fee_info(self, context: str) -> str:
        """Extract fee information from context"""
        lines = context.split('\n')
        fee_lines = [line for line in lines if '₹' in line or 'fee' in line.lower() or 'cost' in line.lower()]
        return '\n'.join(fee_lines[:5]) if fee_lines else "Fee information is available in our documents."
    
    def _load_sample_data(self) -> None:
        """Load sample educational data for demonstration"""
        sample_documents = [
            {
                'doc_id': 'admission_guide',
                'content': '''
                Admission Process and Requirements
                
                Our college follows a comprehensive admission process to ensure quality education for all students.
                
                Application Process:
                1. Online application submission through college portal
                2. Upload required documents
                3. Pay application fee of ₹500
                4. Appear for entrance examination (if applicable)
                5. Document verification
                6. Merit list publication
                7. Final admission confirmation
                
                Required Documents:
                - 10th standard mark sheet and certificate
                - 12th standard mark sheet and certificate
                - Transfer certificate from previous institution
                - Character certificate
                - Caste certificate (if applicable)
                - Income certificate (for fee concession)
                - Passport size photographs (4 copies)
                - Aadhar card copy
                
                Important Dates:
                - Application start date: June 1st
                - Application deadline: July 31st
                - Entrance exam: August 15th
                - Merit list publication: August 25th
                - Admission confirmation deadline: September 5th
                
                Eligibility Criteria:
                - Undergraduate: Minimum 50% in 12th standard
                - Postgraduate: Minimum 55% in graduation
                - Diploma: Minimum 45% in 10th standard
                ''',
                'metadata': {'type': 'admission', 'category': 'process'}
            },
            {
                'doc_id': 'fee_structure',
                'content': '''
                Fee Structure 2024-25
                
                Undergraduate Programs:
                - Engineering: ₹75,000 per year
                - Arts & Science: ₹35,000 per year
                - Commerce: ₹40,000 per year
                - Computer Applications: ₹50,000 per year
                
                Postgraduate Programs:
                - M.Tech: ₹85,000 per year
                - MBA: ₹90,000 per year
                - M.Sc: ₹45,000 per year
                - M.Com: ₹35,000 per year
                
                Diploma Programs:
                - Engineering Diploma: ₹30,000 per year
                - Computer Diploma: ₹25,000 per year
                
                Additional Fees:
                - Admission fee: ₹5,000 (one-time)
                - Library fee: ₹2,000 per year
                - Laboratory fee: ₹3,000 per year
                - Sports fee: ₹1,000 per year
                - Development fee: ₹2,500 per year
                
                Hostel Fees:
                - Boys hostel: ₹35,000 per year
                - Girls hostel: ₹40,000 per year
                - Mess charges: ₹25,000 per year
                
                Payment Schedule:
                - First installment: 60% at admission
                - Second installment: 40% before December 31st
                
                Scholarships Available:
                - Merit scholarship: Up to 50% fee waiver
                - Need-based scholarship: Up to 30% fee waiver
                - Sports scholarship: Up to 25% fee waiver
                ''',
                'metadata': {'type': 'fees', 'category': 'structure'}
            },
            {
                'type': 'faq',
                'doc_id': 'general_faq',
                'faq_data': [
                    {
                        'question': 'What are the college timings?',
                        'answer': 'College timings are 8:00 AM to 5:00 PM on weekdays. Morning batch: 8:00 AM - 1:00 PM, Afternoon batch: 2:00 PM - 7:00 PM. Saturday classes are from 9:00 AM to 1:00 PM.',
                        'category': 'general'
                    },
                    {
                        'question': 'How can I contact the college?',
                        'answer': 'You can contact us at: Phone: +91-XXX-XXX-XXXX, Email: info@college.edu, Address: College Campus, City, State - 123456. Office hours: Monday-Friday 9:00 AM - 5:00 PM.',
                        'category': 'contact'
                    },
                    {
                        'question': 'What documents are required for admission?',
                        'answer': 'Required documents include: 10th & 12th mark sheets, transfer certificate, character certificate, caste certificate (if applicable), income certificate, passport photos, and Aadhar card copy.',
                        'category': 'admission'
                    },
                    {
                        'question': 'Are there any scholarships available?',
                        'answer': 'Yes, we offer merit scholarships (up to 50% fee waiver), need-based scholarships (up to 30% fee waiver), and sports scholarships (up to 25% fee waiver).',
                        'category': 'fees'
                    },
                    {
                        'question': 'What is the hostel facility like?',
                        'answer': 'We have separate hostels for boys and girls with modern amenities. Boys hostel fee: ₹35,000/year, Girls hostel fee: ₹40,000/year, Mess charges: ₹25,000/year.',
                        'category': 'facilities'
                    }
                ]
            }
        ]
        
        logger.info("Loading sample educational data...")
        self.index_documents(sample_documents)
        logger.info("Sample data loaded successfully")
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Get RAG system statistics"""
        vector_stats = self.vector_store.get_stats()
        return {
            'vector_store': vector_stats,
            'embedding_model': self.embedding_service.model_name,
            'chunk_size': self.document_processor.chunk_size,
            'chunk_overlap': self.document_processor.chunk_overlap
        }
