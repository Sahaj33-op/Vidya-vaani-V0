# Vidya Vaani - Multilingual AI Education Chatbot

> Smart India Hackathon 2025 (SIH25104)

An intelligent multilingual chatbot platform designed to democratize access to educational information across language barriers in India.

## Features

- **Multilingual Support**: English, Hindi, Marathi, and Marwari
- **RAG-Powered Responses**: Document-based question answering using FAISS vector search
- **AI-Powered Chat**: Google Gemini API for intelligent responses
- **Admin Dashboard**: Document management and system analytics
- **Voice Input**: Speech-to-text support (Google Cloud Speech)
- **Handoff System**: Escalate complex queries to human administrators

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components

### Backend
- FastAPI (Python)
- Google Gemini API
- FAISS vector store
- Sentence Transformers
- Google Cloud Speech-to-Text

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- Google Gemini API key

### Installation

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd vidya-vaani-v0
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   cd ..
   ```

4. **Configure environment**
   
   Create `.env.local` in project root:
   ```env
   NEXT_PUBLIC_DEV_MODE=false
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   
   Create `backend/.env`:
   ```env
   DEMO_MODE=false
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

### Running the Application

1. **Start backend**
   ```bash
   cd backend
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Start frontend** (in a new terminal)
   ```bash
   npm run dev
   ```

3. **Access the application**
   - Chat Interface: http://localhost:3000
   - Admin Dashboard: http://localhost:3000/admin

## Usage

### Document Upload
1. Navigate to Admin Dashboard
2. Go to "Documents" tab
3. Upload educational documents (PDF, DOCX, TXT, MD)
4. Documents are automatically indexed using FAISS

### Chat
1. Select preferred language
2. Ask questions about uploaded documents
3. AI responds with context from the knowledge base

### Admin Features
- **Statistics**: View system metrics and document counts
- **Documents**: Manage uploaded files
- **Handoffs**: Review queries escalated to human administrators

## Project Structure

```
vidya-vaani-v0/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── admin/             # Admin dashboard pages
│   └── ...
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── services/     # Business logic
│   │   └── core/         # Configuration
│   └── requirements.txt
├── components/            # React components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
├── retriever/            # RAG system (FAISS, embeddings)
├── public/               # Static assets
└── styles/               # Global styles
```

## API Endpoints

### Chat
- `POST /api/v1/chat/text` - Send text message
- `POST /api/v1/chat/audio` - Send voice message

### Documents
- `POST /api/v1/documents/upload` - Upload document
- `GET /api/v1/documents/list` - List all documents

### Admin
- `GET /api/v1/admin/stats` - System statistics
- `GET /api/v1/handoffs/list` - List handoff requests

## Development

### Running Tests
```bash
npm test                  # Frontend tests
cd backend && pytest      # Backend tests
```

### Linting
```bash
npm run lint              # ESLint
```

## Configuration

### Environment Variables

**Frontend (.env.local)**
- `NEXT_PUBLIC_DEV_MODE` - Enable/disable dev mode (true/false)
- `NEXT_PUBLIC_BACKEND_URL` - Backend API URL
- `GEMINI_API_KEY` - Google Gemini API key

**Backend (backend/.env)**
- `DEMO_MODE` - Use mock services (true/false)
- `GEMINI_API_KEY` - Google Gemini API key
- `SUPABASE_URL` - Supabase URL (optional)
- `SUPABASE_ANON_KEY` - Supabase anon key (optional)

## Architecture

The system uses a modular service architecture with dependency injection:

1. **Frontend** - Next.js handles UI and API routing
2. **Backend API** - FastAPI orchestrates services
3. **RAG Service** - FAISS vector store for document retrieval
4. **LLM Service** - Google Gemini for response generation
5. **Storage Service** - Local file storage for documents

## Contributing

This project was developed for Smart India Hackathon 2025.

## License

MIT License

## Acknowledgments

- Google Gemini API for AI capabilities
- FAISS for efficient vector search
- Smart India Hackathon 2025 for the opportunity

---

**Built with ❤️ for Smart India Hackathon 2025**
