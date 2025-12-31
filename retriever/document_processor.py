"""
Document processing and chunking for RAG system
Handles PDF parsing, DOCX parsing, text chunking, and metadata extraction
"""

import os
import re
import hashlib
from typing import List, Dict, Any, Optional, Tuple, BinaryIO
from pathlib import Path
import logging
import io

logger = logging.getLogger(__name__)

class DocumentChunk:
    """Represents a chunk of document text with metadata"""
    
    def __init__(self, text: str, doc_id: str, chunk_id: str, 
                 page_num: Optional[int] = None, metadata: Optional[Dict] = None):
        self.text = text
        self.doc_id = doc_id
        self.chunk_id = chunk_id
        self.page_num = page_num
        self.metadata = metadata or {}
        self.text_hash = self._generate_hash()
    
    def _generate_hash(self) -> str:
        """Generate hash for chunk deduplication"""
        return hashlib.md5(self.text.encode()).hexdigest()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert chunk to dictionary"""
        return {
            'text': self.text,
            'doc_id': self.doc_id,
            'chunk_id': self.chunk_id,
            'page_num': self.page_num,
            'metadata': self.metadata,
            'text_hash': self.text_hash
        }

class DocumentProcessor:
    """Processes documents for RAG indexing"""
    
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        """
        Initialize document processor
        
        Args:
            chunk_size: Maximum tokens per chunk
            chunk_overlap: Overlap between chunks in tokens
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    def process_text_file(self, file_path: str, doc_id: Optional[str] = None) -> List[DocumentChunk]:
        """
        Process a text file into chunks
        
        Args:
            file_path: Path to text file
            doc_id: Document identifier
            
        Returns:
            List of DocumentChunk objects
        """
        if not doc_id:
            doc_id = Path(file_path).stem
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            logger.info(f"Processing text file: {file_path}")
            chunks = self._chunk_text(content, doc_id)
            logger.info(f"Created {len(chunks)} chunks from {file_path}")
            
            return chunks
        except Exception as e:
            logger.error(f"Failed to process text file {file_path}: {e}")
            raise
    
    def process_faq_data(self, faq_data: List[Dict[str, str]]) -> List[DocumentChunk]:
        """
        Process FAQ data into chunks
        
        Args:
            faq_data: List of FAQ dictionaries with 'question' and 'answer' keys
            
        Returns:
            List of DocumentChunk objects
        """
        chunks = []
        
        for i, faq in enumerate(faq_data):
            question = faq.get('question', '')
            answer = faq.get('answer', '')
            category = faq.get('category', 'general')
            
            # Combine question and answer
            text = f"Q: {question}\nA: {answer}"
            
            chunk = DocumentChunk(
                text=text,
                doc_id=f"faq_{category}",
                chunk_id=f"faq_{category}_{i}",
                metadata={
                    'type': 'faq',
                    'category': category,
                    'question': question,
                    'answer': answer
                }
            )
            chunks.append(chunk)
        
        logger.info(f"Created {len(chunks)} FAQ chunks")
        return chunks
    
    def _chunk_text(self, text: str, doc_id: str) -> List[DocumentChunk]:
        """
        Split text into overlapping chunks
        
        Args:
            text: Text to chunk
            doc_id: Document identifier
            
        Returns:
            List of DocumentChunk objects
        """
        # Clean and normalize text
        text = self._clean_text(text)
        
        # Simple sentence-based chunking
        sentences = self._split_into_sentences(text)
        chunks = []
        
        current_chunk = []
        current_length = 0
        chunk_id = 0
        
        for sentence in sentences:
            sentence_length = len(sentence.split())
            
            # If adding this sentence would exceed chunk size, create a chunk
            if current_length + sentence_length > self.chunk_size and current_chunk:
                chunk_text = ' '.join(current_chunk)
                chunk = DocumentChunk(
                    text=chunk_text,
                    doc_id=doc_id,
                    chunk_id=f"{doc_id}_chunk_{chunk_id}",
                    metadata={'chunk_index': chunk_id}
                )
                chunks.append(chunk)
                
                # Start new chunk with overlap
                overlap_sentences = current_chunk[-self.chunk_overlap//10:] if len(current_chunk) > self.chunk_overlap//10 else current_chunk
                current_chunk = overlap_sentences + [sentence]
                current_length = sum(len(s.split()) for s in current_chunk)
                chunk_id += 1
            else:
                current_chunk.append(sentence)
                current_length += sentence_length
        
        # Add final chunk if there's remaining content
        if current_chunk:
            chunk_text = ' '.join(current_chunk)
            chunk = DocumentChunk(
                text=chunk_text,
                doc_id=doc_id,
                chunk_id=f"{doc_id}_chunk_{chunk_id}",
                metadata={'chunk_index': chunk_id}
            )
            chunks.append(chunk)
        
        return chunks
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters but keep punctuation
        text = re.sub(r'[^\w\s\.\,\?\!\;\:\-$$$$]', ' ', text)
        return text.strip()
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences"""
        # Simple sentence splitting
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        return sentences

    def process_pdf_file(self, file_path: str, doc_id: Optional[str] = None) -> List[DocumentChunk]:
        """
        Process a PDF file into chunks

        Args:
            file_path: Path to PDF file
            doc_id: Document identifier

        Returns:
            List of DocumentChunk objects
        """
        if not doc_id:
            doc_id = Path(file_path).stem

        try:
            # Try pdfplumber first (better for tables and complex layouts)
            try:
                import pdfplumber
                return self._process_pdf_with_pdfplumber(file_path, doc_id)
            except ImportError:
                pass

            # Fallback to PyPDF2
            try:
                import PyPDF2
                return self._process_pdf_with_pypdf2(file_path, doc_id)
            except ImportError:
                pass

            raise ImportError("Neither pdfplumber nor PyPDF2 is installed. Install with: pip install pdfplumber PyPDF2")

        except Exception as e:
            logger.error(f"Failed to process PDF file {file_path}: {e}")
            raise

    def _process_pdf_with_pdfplumber(self, file_path: str, doc_id: str) -> List[DocumentChunk]:
        """Process PDF using pdfplumber library"""
        import pdfplumber

        all_chunks = []

        with pdfplumber.open(file_path) as pdf:
            logger.info(f"Processing PDF with pdfplumber: {file_path} ({len(pdf.pages)} pages)")

            for page_num, page in enumerate(pdf.pages, start=1):
                # Extract text from page
                text = page.extract_text() or ""

                if not text.strip():
                    continue

                # Create chunks with page metadata
                chunks = self._chunk_text(text, doc_id)

                for chunk in chunks:
                    chunk.page_num = page_num
                    chunk.metadata['page'] = page_num
                    chunk.metadata['source_type'] = 'pdf'
                    chunk.metadata['file_path'] = file_path
                    # Update chunk_id to include page number
                    chunk.chunk_id = f"{chunk.chunk_id}_page_{page_num}"

                all_chunks.extend(chunks)

        logger.info(f"Created {len(all_chunks)} chunks from PDF: {file_path}")
        return all_chunks

    def _process_pdf_with_pypdf2(self, file_path: str, doc_id: str) -> List[DocumentChunk]:
        """Process PDF using PyPDF2 library"""
        import PyPDF2

        all_chunks = []

        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            logger.info(f"Processing PDF with PyPDF2: {file_path} ({len(pdf_reader.pages)} pages)")

            for page_num, page in enumerate(pdf_reader.pages, start=1):
                # Extract text from page
                text = page.extract_text() or ""

                if not text.strip():
                    continue

                # Create chunks with page metadata
                chunks = self._chunk_text(text, doc_id)

                for chunk in chunks:
                    chunk.page_num = page_num
                    chunk.metadata['page'] = page_num
                    chunk.metadata['source_type'] = 'pdf'
                    chunk.metadata['file_path'] = file_path
                    chunk.chunk_id = f"{chunk.chunk_id}_page_{page_num}"

                all_chunks.extend(chunks)

        logger.info(f"Created {len(all_chunks)} chunks from PDF: {file_path}")
        return all_chunks

    def process_pdf_bytes(self, file_bytes: bytes, doc_id: str, filename: str = "upload.pdf") -> List[DocumentChunk]:
        """
        Process PDF from bytes (for file uploads)

        Args:
            file_bytes: PDF file content as bytes
            doc_id: Document identifier
            filename: Original filename

        Returns:
            List of DocumentChunk objects
        """
        try:
            # Try pdfplumber first
            try:
                import pdfplumber
                return self._process_pdf_bytes_with_pdfplumber(file_bytes, doc_id, filename)
            except ImportError:
                pass

            # Fallback to PyPDF2
            try:
                import PyPDF2
                return self._process_pdf_bytes_with_pypdf2(file_bytes, doc_id, filename)
            except ImportError:
                pass

            raise ImportError("Neither pdfplumber nor PyPDF2 is installed")

        except Exception as e:
            logger.error(f"Failed to process PDF bytes: {e}")
            raise

    def _process_pdf_bytes_with_pdfplumber(self, file_bytes: bytes, doc_id: str, filename: str) -> List[DocumentChunk]:
        """Process PDF bytes using pdfplumber"""
        import pdfplumber

        all_chunks = []

        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            logger.info(f"Processing PDF bytes with pdfplumber: {filename} ({len(pdf.pages)} pages)")

            for page_num, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""

                if not text.strip():
                    continue

                chunks = self._chunk_text(text, doc_id)

                for chunk in chunks:
                    chunk.page_num = page_num
                    chunk.metadata['page'] = page_num
                    chunk.metadata['source_type'] = 'pdf'
                    chunk.metadata['filename'] = filename
                    chunk.chunk_id = f"{chunk.chunk_id}_page_{page_num}"

                all_chunks.extend(chunks)

        logger.info(f"Created {len(all_chunks)} chunks from PDF bytes: {filename}")
        return all_chunks

    def _process_pdf_bytes_with_pypdf2(self, file_bytes: bytes, doc_id: str, filename: str) -> List[DocumentChunk]:
        """Process PDF bytes using PyPDF2"""
        import PyPDF2

        all_chunks = []
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))

        logger.info(f"Processing PDF bytes with PyPDF2: {filename} ({len(pdf_reader.pages)} pages)")

        for page_num, page in enumerate(pdf_reader.pages, start=1):
            text = page.extract_text() or ""

            if not text.strip():
                continue

            chunks = self._chunk_text(text, doc_id)

            for chunk in chunks:
                chunk.page_num = page_num
                chunk.metadata['page'] = page_num
                chunk.metadata['source_type'] = 'pdf'
                chunk.metadata['filename'] = filename
                chunk.chunk_id = f"{chunk.chunk_id}_page_{page_num}"

            all_chunks.extend(chunks)

        logger.info(f"Created {len(all_chunks)} chunks from PDF bytes: {filename}")
        return all_chunks

    def process_docx_file(self, file_path: str, doc_id: Optional[str] = None) -> List[DocumentChunk]:
        """
        Process a DOCX file into chunks

        Args:
            file_path: Path to DOCX file
            doc_id: Document identifier

        Returns:
            List of DocumentChunk objects
        """
        if not doc_id:
            doc_id = Path(file_path).stem

        try:
            from docx import Document
        except ImportError:
            raise ImportError("python-docx is not installed. Install with: pip install python-docx")

        try:
            doc = Document(file_path)
            logger.info(f"Processing DOCX file: {file_path}")

            # Extract all paragraphs
            paragraphs = []
            for para in doc.paragraphs:
                text = para.text.strip()
                if text:
                    paragraphs.append(text)

            # Extract text from tables
            for table in doc.tables:
                for row in table.rows:
                    row_text = ' | '.join(cell.text.strip() for cell in row.cells if cell.text.strip())
                    if row_text:
                        paragraphs.append(row_text)

            # Combine all text
            full_text = '\n'.join(paragraphs)

            # Create chunks
            chunks = self._chunk_text(full_text, doc_id)

            for chunk in chunks:
                chunk.metadata['source_type'] = 'docx'
                chunk.metadata['file_path'] = file_path

            logger.info(f"Created {len(chunks)} chunks from DOCX: {file_path}")
            return chunks

        except Exception as e:
            logger.error(f"Failed to process DOCX file {file_path}: {e}")
            raise

    def process_docx_bytes(self, file_bytes: bytes, doc_id: str, filename: str = "upload.docx") -> List[DocumentChunk]:
        """
        Process DOCX from bytes (for file uploads)

        Args:
            file_bytes: DOCX file content as bytes
            doc_id: Document identifier
            filename: Original filename

        Returns:
            List of DocumentChunk objects
        """
        try:
            from docx import Document
        except ImportError:
            raise ImportError("python-docx is not installed. Install with: pip install python-docx")

        try:
            doc = Document(io.BytesIO(file_bytes))
            logger.info(f"Processing DOCX bytes: {filename}")

            # Extract all paragraphs
            paragraphs = []
            for para in doc.paragraphs:
                text = para.text.strip()
                if text:
                    paragraphs.append(text)

            # Extract text from tables
            for table in doc.tables:
                for row in table.rows:
                    row_text = ' | '.join(cell.text.strip() for cell in row.cells if cell.text.strip())
                    if row_text:
                        paragraphs.append(row_text)

            # Combine all text
            full_text = '\n'.join(paragraphs)

            # Create chunks
            chunks = self._chunk_text(full_text, doc_id)

            for chunk in chunks:
                chunk.metadata['source_type'] = 'docx'
                chunk.metadata['filename'] = filename

            logger.info(f"Created {len(chunks)} chunks from DOCX bytes: {filename}")
            return chunks

        except Exception as e:
            logger.error(f"Failed to process DOCX bytes: {e}")
            raise

    def process_file(self, file_path: str, doc_id: Optional[str] = None) -> List[DocumentChunk]:
        """
        Process any supported file type into chunks

        Args:
            file_path: Path to file
            doc_id: Document identifier

        Returns:
            List of DocumentChunk objects
        """
        path = Path(file_path)
        extension = path.suffix.lower()

        if extension == '.pdf':
            return self.process_pdf_file(file_path, doc_id)
        elif extension == '.docx':
            return self.process_docx_file(file_path, doc_id)
        elif extension in ['.txt', '.md', '.rst']:
            return self.process_text_file(file_path, doc_id)
        else:
            # Try to process as text file
            logger.warning(f"Unknown file type {extension}, attempting to process as text")
            return self.process_text_file(file_path, doc_id)

    def process_file_bytes(self, file_bytes: bytes, filename: str, doc_id: str) -> List[DocumentChunk]:
        """
        Process any supported file type from bytes

        Args:
            file_bytes: File content as bytes
            filename: Original filename (used to determine file type)
            doc_id: Document identifier

        Returns:
            List of DocumentChunk objects
        """
        extension = Path(filename).suffix.lower()

        if extension == '.pdf':
            return self.process_pdf_bytes(file_bytes, doc_id, filename)
        elif extension == '.docx':
            return self.process_docx_bytes(file_bytes, doc_id, filename)
        elif extension in ['.txt', '.md', '.rst']:
            # Decode bytes as text
            text = file_bytes.decode('utf-8', errors='ignore')
            chunks = self._chunk_text(text, doc_id)
            for chunk in chunks:
                chunk.metadata['source_type'] = 'text'
                chunk.metadata['filename'] = filename
            return chunks
        else:
            # Try to process as text
            logger.warning(f"Unknown file type {extension}, attempting to process as text")
            text = file_bytes.decode('utf-8', errors='ignore')
            chunks = self._chunk_text(text, doc_id)
            for chunk in chunks:
                chunk.metadata['source_type'] = 'unknown'
                chunk.metadata['filename'] = filename
            return chunks
