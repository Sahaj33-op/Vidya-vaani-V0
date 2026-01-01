# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vidya Vaani is a multilingual AI education chatbot for Smart India Hackathon 2025 (SIH25104). It supports English, Hindi, Marathi, and Marwari with RAG-based document retrieval.

## Development Commands

### Frontend (Next.js)
```bash
npm run dev          # Start development server (port 3000)
npm run build        # Production build
npm run lint         # Run ESLint
```

### Backend (FastAPI)
```bash
cd backend && uvicorn app.main:app --reload  # Start dev server (port 8000)
cd backend && pytest                          # Run tests
cd backend && pytest -v                       # Verbose test output
cd backend && pytest --cov=. --cov-report=html  # Coverage report
```

### Testing
```bash
npm test                    # Run Jest tests
npm run test:watch          # Jest watch mode
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:e2e            # Playwright E2E tests
npm run test:e2e:ui         # E2E with UI
npm run test:backend        # Backend pytest
```

### Docker
```bash
docker-compose up --build           # Full stack (Next.js, FastAPI, Rasa, Redis, NGINX, Prometheus, Grafana)
docker-compose -f docker-compose.dev.yml up --build  # Development mode
```

## Architecture

### Monorepo Structure
- **Frontend**: Next.js 14 (App Router) with TypeScript/Tailwind at root
- **Backend**: FastAPI Python API in `/backend`
- **NLU**: Rasa 3.x in `/rasa`
- **RAG**: Vector store and embeddings in `/retriever`
- **Translation**: MarianMT services in `/translation`

### Service Adapter Pattern
The backend uses dependency injection with service adapters controlled by `DEMO_MODE` env var:

```python
# backend/app/dependencies.py
def get_llm_service() -> LLMService:
    if settings.DEMO_MODE:
        return MockLLMService()      # Returns static responses
    return GeminiLLMService()        # Uses Google Gemini API
```

Services with mock/production implementations:
- `LLMService`: MockLLMService / GeminiLLMService
- `StorageService`: LocalStorageService / SupabaseStorageAdapter
- `AuthService`: MockAuthService / SupabaseAuthService
- `VectorStore`: FAISSVectorStore / SupabaseVectorStore
- `STTService`, `OCRService`, `RasaNLUService`

### API Flow
1. User message -> `ChatInterface` component
2. `useChat` hook (`hooks/use-chat.ts`) manages state/localStorage
3. POST to `/api/chat` (Next.js API route)
4. Dev mode: returns mock response; Prod: proxies to FastAPI
5. FastAPI orchestrates: language detection -> translation -> Rasa NLU -> RAG -> LLM -> translate back

### Key Directories
- `/app/api` - Next.js API routes (BFF layer)
- `/backend/app/api/v1/endpoints` - FastAPI endpoints
- `/backend/app/services` - Service implementations with adapters
- `/backend/app/dependencies.py` - Dependency injection factory functions
- `/components` - React components (chat-interface, admin-dashboard, language-selector)
- `/hooks` - Custom React hooks (use-chat.ts is the main chat state manager)
- `/lib` - Utilities (mock-data-store.ts for dev mode data)

## Environment Configuration

### Frontend (.env.local)
```
NEXT_PUBLIC_DEV_MODE=true           # Use mock responses without backend
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
KV_REST_API_URL=                    # Upstash Redis URL (production)
KV_REST_API_TOKEN=                  # Upstash Redis token
```

### Backend (backend/.env)
```
DEMO_MODE=false                     # Toggle mock vs real services
GEMINI_API_KEY=                     # Required when DEMO_MODE=false
SUPABASE_URL=                       # Required when DEMO_MODE=false
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
S3_BUCKET_NAME=
```

## Service Ports
- **3000**: Next.js frontend
- **8000**: FastAPI backend
- **5005**: Rasa NLU server
- **5055**: Rasa actions server
- **6379**: Redis
- **9090**: Prometheus
- **3001**: Grafana (admin/admin123)

## Code Patterns

### Adding a New Backend Service
1. Define abstract base class in `/backend/app/services/`
2. Implement mock version for `DEMO_MODE=true`
3. Implement real version for production
4. Add factory function in `/backend/app/dependencies.py`
5. Use dependency injection in endpoints

### Frontend Dev Mode
The frontend checks `NEXT_PUBLIC_DEV_MODE` to use local mock data from `/lib/mock-data-store.ts` instead of calling the backend. This enables frontend development without running the full stack.

## Current Status
Project is ~25% complete. Admin dashboard, chat interface, and backend API services are working. The backend supports both demo mode (MockLLMService with keyword-based responses) and production mode (GeminiLLMService). Next up: RAG system, translation services, and Rasa NLU integration.
