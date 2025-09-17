# Multilingual Education Chatbot

A comprehensive multilingual education chatbot supporting English, Hindi, Marathi, and Marwari languages with RAG capabilities for document search and FAQ answering.

## 🚀 Quick Start

### Development Environment

1. **Clone and setup:**
   \`\`\`bash
   git clone <repository-url>
   cd multilingual-chatbot
   chmod +x scripts/dev-setup.sh
   ./scripts/dev-setup.sh
   \`\`\`

2. **Update environment variables in `.env.local`:**
   \`\`\`bash
   KV_REST_API_URL=your_upstash_redis_url
   KV_REST_API_TOKEN=your_upstash_redis_token
   UPSTASH_SEARCH_REST_URL=your_upstash_search_url
   UPSTASH_SEARCH_REST_TOKEN=your_upstash_search_token
   \`\`\`

3. **Start development environment:**
   \`\`\`bash
   docker-compose -f docker-compose.dev.yml up --build
   \`\`\`

### Production Deployment

1. **Kubernetes deployment:**
   \`\`\`bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   \`\`\`

2. **Docker Compose deployment:**
   \`\`\`bash
   docker-compose up --build -d
   \`\`\`

## 🏗️ Architecture

### Components

- **Frontend**: Next.js application with multilingual chat interface
- **NLU Engine**: Rasa for intent recognition and dialogue management
- **RAG System**: SentenceTransformers + FAISS for document retrieval
- **Translation**: MarianMT for multilingual support
- **Cache**: Redis for session management and response caching
- **Admin Dashboard**: Document management and system monitoring

### Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Flask, Python 3.11
- **NLU**: Rasa 3.x with custom actions
- **ML**: SentenceTransformers, FAISS, MarianMT
- **Database**: Redis (Upstash), Upstash Search
- **Deployment**: Docker, Kubernetes, NGINX
- **Monitoring**: Prometheus, Grafana

## 📁 Project Structure

\`\`\`
multilingual-chatbot/
├── app/                    # Next.js application
│   ├── api/               # API routes
│   ├── admin/             # Admin dashboard
│   └── components/        # React components
├── rasa/                  # Rasa NLU configuration
│   ├── data/             # Training data
│   ├── actions/          # Custom actions
│   └── models/           # Trained models
├── retriever/            # RAG system
├── translation/          # Translation services
├── k8s/                  # Kubernetes manifests
├── nginx/                # NGINX configuration
├── monitoring/           # Prometheus & Grafana
└── scripts/              # Deployment scripts
\`\`\`

## 🌐 API Endpoints

### Chat API
- `POST /api/ask` - Main chat endpoint
- `POST /api/translate` - Translation service
- `POST /api/rag` - Document search

### Admin API
- `GET /api/admin/documents` - List documents
- `POST /api/admin/upload` - Upload documents
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/handoffs` - Human handoff requests

## 🔧 Configuration

### Environment Variables

\`\`\`bash
# Redis (Required)
KV_REST_API_URL=https://your-redis.upstash.io
KV_REST_API_TOKEN=your-redis-token

# Search (Required)
UPSTASH_SEARCH_REST_URL=https://your-search.upstash.io
UPSTASH_SEARCH_REST_TOKEN=your-search-token

# Application
NODE_ENV=production
FLASK_ENV=production
\`\`\`

### Language Support

- **English**: Primary language for processing
- **Hindi**: Full translation support
- **Marathi**: Translation via MarianMT
- **Marwari**: Fallback translation to Hindi/English

## 📊 Monitoring

- **Grafana Dashboard**: http://localhost:3001 (admin/admin123)
- **Prometheus Metrics**: http://localhost:9090
- **Application Logs**: `docker-compose logs -f`

## 🧪 Testing

### Manual Testing Checklist

1. **Multilingual Input**: Test Hindi, Marathi, Marwari inputs
2. **Intent Recognition**: Verify fees, admission, timetable queries
3. **Document Search**: Test RAG functionality
4. **Human Handoff**: Verify volunteer notification system
5. **Admin Functions**: Test document upload and management

### Performance Targets

- Response time: ≤ 2s (cached), ≤ 5s (cold)
- Intent accuracy: ≥ 80% on validation set
- Translation confidence: ≥ 70% for Marwari fallback

## 🚨 Troubleshooting

### Common Issues

1. **Redis Authentication Error**:
   \`\`\`bash
   # Check environment variables
   echo $KV_REST_API_URL
   echo $KV_REST_API_TOKEN
   \`\`\`

2. **Rasa Model Loading**:
   \`\`\`bash
   # Retrain Rasa model
   cd rasa && rasa train
   \`\`\`

3. **Translation Failures**:
   \`\`\`bash
   # Check MarianMT model downloads
   docker-compose logs translation-service
   \`\`\`

## 📝 Development

### Adding New Intents

1. Update `rasa/data/nlu.yml` with training examples
2. Add intent to `rasa/domain.yml`
3. Create custom action in `rasa/actions/actions.py`
4. Retrain model: `rasa train`

### Adding New Languages

1. Update language detection in `translation/language_detector.py`
2. Add translation mappings in `translation/translator.py`
3. Update UI language selector in `components/chat-interface.tsx`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
