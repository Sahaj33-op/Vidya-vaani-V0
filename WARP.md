# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Vidya Vaani** is a comprehensive multilingual education chatbot solution built for Smart India Hackathon 2025 (SIH25104). This project addresses the critical need for multilingual, 24/7 student support in educational institutions, particularly focusing on rural and first-generation students.

### Problem Statement
- **High Query Load**: Colleges face overwhelming queries about deadlines, fees, scholarships, and timetables
- **Multilingual Access**: Students need support in native languages with low-connectivity solutions  
- **24/7 Availability**: Requirement for instant access beyond office hours
- **Proactive Communication**: Need for automated notifications about important deadlines and events

### Current Implementation Status
The current codebase represents **Phase 1** of the full SIH solution:
- ✅ **Core Chat System**: Next.js frontend with multilingual support (English, Hindi, Marathi, Marwari)
- ✅ **RAG Pipeline**: FAISS-based document retrieval with SentenceTransformers
- ✅ **Translation Service**: MarianMT-based translation with language detection
- ✅ **Intent Recognition**: Rasa NLU for understanding user queries
- ✅ **Admin Dashboard**: Basic document management and analytics interface
- ✅ **Monitoring Stack**: Grafana/Prometheus for system observability

### Full Vision (Target Architecture)
The complete SIH solution includes additional components not yet implemented:
- 🔲 **Multi-Platform Access**: Telegram bot, React Native offline app, website widget
- 🔲 **Voice Support**: OpenAI Whisper STT, voice responses
- 🔲 **Smart Document Analysis**: OCR pipeline with Tesseract for PDF processing
- 🔲 **Proactive Notifications**: Personalized alerts system
- 🔲 **Advanced Analytics**: Comprehensive insights dashboard for administrators
- 🔲 **Enhanced Language Support**: Gujarati + transliteration support

## Development Commands

### Quick Start
```bash
# Development setup (creates .env.local, installs deps, starts services)
./scripts/dev-setup.sh

# Start development environment with hot reload
docker-compose -f docker-compose.dev.yml up --build

# Stop development environment
docker-compose -f docker-compose.dev.yml down
```

### Frontend (Next.js)
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Linting
npm run lint
```

### Backend Services
```bash
# Build and run all production services
docker-compose up --build -d

# View logs for all services
docker-compose logs -f

# View logs for specific service
docker-compose logs -f flask-backend
docker-compose logs -f rasa-server

# Restart specific service
docker-compose restart flask-backend
```

### Rasa NLU
```bash
# Train Rasa model
cd rasa && rasa train

# Test Rasa model
cd rasa && rasa test

# Interactive Rasa shell (for testing intents)
cd rasa && rasa shell
```

### Testing
```bash
# Run Next.js test suite
npm run test

# Run Rasa model tests
cd rasa && rasa test

# Performance testing
k6 run performance-tests.js
```

## High-Level Architecture

### Microservices Structure
The application follows a microservices architecture with the following key components:

1. **Frontend (Next.js)**: React-based UI with TypeScript and Tailwind CSS
2. **Flask Backend**: Python API server handling RAG, translation, and orchestration
3. **Rasa Server**: NLU engine for intent recognition and dialogue management
4. **Rasa Actions**: Custom action server for complex business logic
5. **Redis**: Session management and caching
6. **NGINX**: Reverse proxy and load balancer

### Data Flow
```
User Input → Next.js UI → Flask Backend → {
  - Language Detection & Translation
  - RAG System (FAISS + SentenceTransformers)
  - Rasa NLU (Intent Recognition)
} → Response Processing → UI
```

### Key Technical Components

**Translation System** (`translation/`):
- MarianMT for multilingual translation
- Language detection using `franc` and `langdetect`
- Supports English, Hindi, Marathi, and Marwari

**RAG System** (`retriever/`):
- FAISS vector database for document search
- SentenceTransformers for embeddings
- Document chunking and indexing

**Intent Processing**:
- Rasa NLU for intent classification
- Custom actions in `rasa/actions/`
- Domain configuration in `rasa/domain.yml`

### Environment Configuration

Required environment variables (set in `.env.local`):
```bash
KV_REST_API_URL=<redis_connection_url>
KV_REST_API_TOKEN=<redis_auth_token>
UPSTASH_SEARCH_REST_URL=<upstash_search_url>
UPSTASH_SEARCH_REST_TOKEN=<upstash_search_token>
```

## Deployment

### Development Deployment
Use `docker-compose.dev.yml` for development with hot reload and volume mounting.

### Production Deployment
- **Docker**: Use main `docker-compose.yml` with production settings
- **Kubernetes**: Use `./scripts/deploy.sh` for K8s deployment
- **Monitoring**: Grafana (port 3001) and Prometheus (port 9090) included

### Service Ports
- Next.js: 3000
- Flask Backend: 8000  
- Rasa Server: 5005
- Rasa Actions: 5055
- Redis: 6379
- Grafana: 3001
- Prometheus: 9090

## Language Support

The application processes queries in multiple languages through:
1. **Language Detection**: Automatic detection using script analysis and pattern matching
2. **Translation Pipeline**: MarianMT models for translation to/from English
3. **Intent Recognition**: Rasa processes intents primarily in English
4. **Response Translation**: Final responses translated back to user's language

### Currently Supported Languages
- **English (en)**: Primary processing language with full model support
- **Hindi (hi)**: Complete MarianMT translation support
- **Marathi (mr)**: Complete MarianMT translation support  
- **Marwari (mwr)**: Phrase-mapping fallback to Hindi (partial support)

### Planned Language Additions
- **Gujarati (gu)**: Requires MarianMT model integration
- **Transliteration Support**: For users typing in Roman script

To add new languages:
1. Update `translation/language_detector.py` with new language patterns
2. Add translation models in `translation/translator.py`
3. Update UI language selectors in `components/chat-interface.tsx`
4. Retrain Rasa model with multilingual training data
5. Add language-specific response templates

## Performance Targets

| Metric | Target | 
|--------|--------|
| Response Time (Cached) | ≤ 2s |
| Response Time (Cold) | ≤ 5s |
| Intent Accuracy | ≥ 80% |
| Translation Confidence | ≥ 70% |
| System Uptime | ≥ 99.5% |

## Common Troubleshooting

### Redis Connection Issues
```bash
# Check environment variables
echo $KV_REST_API_URL
echo $KV_REST_API_TOKEN

# Test Redis connectivity
docker-compose exec redis redis-cli ping
```

### Rasa Model Issues
```bash
# Retrain model
cd rasa && rasa train

# Check model loading
docker-compose logs rasa-server
```

### Translation Service Issues
```bash
# Check MarianMT model downloads
docker-compose logs flask-backend

# Test translation endpoint
curl -X POST http://localhost:8000/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "नमस्ते", "detect_language": true}'
```

## Implementation Roadmap

### Phase 1: Core System (Current)
- ✅ Basic multilingual chat interface
- ✅ Document retrieval and RAG pipeline
- ✅ Translation services with MarianMT
- ✅ Admin dashboard for document management
- ✅ Production deployment with monitoring

### Phase 2: Enhanced Features (Next Steps)
1. **Voice Integration**: Add OpenAI Whisper for STT
2. **OCR Pipeline**: Implement Tesseract for document analysis  
3. **Telegram Bot**: Create bot interface for wider accessibility
4. **Gujarati Support**: Add full translation pipeline
5. **Transliteration**: Support Roman script input

### Phase 3: Advanced Analytics & Notifications
1. **Proactive Notifications**: Implement alert system
2. **Advanced Analytics**: Enhanced reporting and insights
3. **React Native App**: Offline mobile application
4. **Performance Optimization**: Scale for 10,000+ users

### Phase 4: Enterprise & Scale
1. **Multi-college SaaS**: Deployment across institutions
2. **Government Integration**: State-level adoption
3. **EdTech Partnerships**: Integration with learning platforms
4. **Advanced AI**: Custom models for educational content

## Architecture Transition Notes

### Current Architecture
- **Frontend**: Next.js 14 with TypeScript and Radix UI
- **Backend**: Flask + Rasa microservices
- **Database**: Redis (Upstash) for caching, FAISS for vector search
- **Translation**: MarianMT with custom language detection
- **Deployment**: Docker Compose with Kubernetes support

### Target Architecture Differences
- **API Framework**: Consider migrating from Flask to FastAPI for better async support
- **Database**: Add Supabase (PostgreSQL) for structured data and pgvector for embeddings
- **ML Models**: Integrate mBERT/XLM-R for improved multilingual understanding
- **Storage**: Add MinIO/S3 for document storage
- **Messaging**: Add message queue (Redis/RabbitMQ) for notifications

## Business Impact & Metrics

### Quantitative Goals
- **Query Reduction**: Target 60% reduction in manual queries to staff
- **Time Savings**: 20+ hours/week saved for administrative staff
- **Cost Savings**: ₹2-5 Lakh/year operational cost reduction
- **Scale**: Support 10,000+ students per month
- **Availability**: Maintain 99.5%+ uptime
- **Response Time**: <2s for cached queries, <5s for complex queries

### Adoption Strategy
- **Pilot Phase**: Single college deployment and optimization
- **Regional Expansion**: 10-50 colleges within state
- **National Scale**: 100+ institutions across multiple states
- **Government Partnership**: State education department integration

## Development Guidelines

### Code Organization
- **Microservices**: Each major component (translation, RAG, intent) as separate service
- **API-First**: RESTful APIs with clear contracts between services  
- **Monitoring**: Comprehensive logging and metrics for all interactions
- **Caching**: Aggressive caching strategy for performance
- **Security**: RBAC, TLS encryption, anonymized logs

### Quality Standards
- **Intent Accuracy**: Maintain >80% accuracy in intent classification
- **Translation Quality**: >70% confidence threshold for auto-translation
- **Response Relevance**: Use source attribution for all document-based responses
- **Error Handling**: Graceful fallbacks for all service failures
- **Scalability**: Design for horizontal scaling across all components

The system serves as a foundation for transforming educational institution communication, with particular focus on inclusive multilingual support for underserved student populations.
