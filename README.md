<div align="center">

# 🎓 **Vidya Vaani** - Multilingual Education Chatbot

[![Deployment](https://img.shields.io/badge/Deploy-Docker%20%7C%20K8s-blue?style=for-the-badge&logo=docker)](https://github.com/sahaj33-op/vidya-vaani-v0)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge&logo=mit)](LICENSE)
[![SIH 2025](https://img.shields.io/badge/Smart%20India%20Hackathon-2025-orange?style=for-the-badge)](https://sih.gov.in)
[![Team](https://img.shields.io/badge/Team-Fusion%20Six-purple?style=for-the-badge)](https://github.com/sahaj33-op)

</div>

> **Smart India Hackathon 2025 - Problem Statement SIH25104**  
> A multilingual, language-agnostic AI chatbot designed for colleges and universities.

**Vidya Vaani** is a robust, multilingual education chatbot supporting **English**, **Hindi**, **Marathi**, and **Marwari**, featuring advanced Retrieval-Augmented Generation (RAG) capabilities for document search, FAQ answering, and intelligent conversation handling.

---

## 🌟 **Features**

### 🗣️ **Multilingual Support**
- **Real-time Translation**: Seamless communication across 4+ languages.
- **Language Detection**: Automatically identifies input language.
- **Cultural Context**: Delivers language-specific responses with appropriate formatting.

### 🧠 **Intelligent Conversation**
- **Intent Recognition**: Powered by the Rasa NLU engine for accurate intent detection.
- **Context Awareness**: Maintains conversation history for coherent interactions.
- **Human Handoff**: Smart escalation to human volunteers when needed.

### 📚 **Knowledge Base**
- **RAG System**: Advanced document retrieval using FAISS and SentenceTransformers.
- **Smart Search**: Semantic search with efficient document chunking.
- **Admin Dashboard**: Intuitive interface for document management and uploads.

### 🏗️ **Enterprise Architecture**
- **Microservices**: Scalable, containerized services for flexibility.
- **Real-time Cache**: Redis-powered session management for performance.
- **Monitoring**: Prometheus and Grafana for system observability.
- **Cloud Ready**: Kubernetes deployment with auto-scaling capabilities.
- **Modular Adapters**: Service adapter pattern for easy switching between demo and production modes

---

## 🚀 **Quick Start**

### **Prerequisites**
- **Docker** & **Docker Compose**
- **Node.js** 18+ (for development)
- **Python** 3.11+ (for development)

### 🐳 **Docker Deployment (Recommended)**

```bash
# Clone the repository
git clone https://github.com/sahaj33-op/vidya-vaani-v0.git
cd vidya-vaani-v0

# Set up environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Deploy with Docker Compose
docker-compose up --build -d

# Access the application
open http://localhost:3000
```

### ⚙️ **Development Setup**

```bash
# Make setup script executable
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh

# Start development environment
docker-compose -f docker-compose.dev.yml up --build

# Development URLs
# Frontend: http://localhost:3000
# Admin: http://localhost:3000/admin
# Rasa API: http://localhost:5005
# Backend API: http://localhost:8000
```

### ☸️ **Kubernetes Deployment**

```bash
# Deploy to Kubernetes cluster
chmod +x scripts/deploy.sh
./scripts/deploy.sh

# Check deployment status
kubectl get pods -n vidya-vaani
```

---

## 🏛️ **Architecture**

```plaintext
┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐
│     Next.js UI     │◄──►│    FastAPI API     │◄──►│     Rasa NLU       │
│    (Frontend)      │    │    (Backend)       │    │    (Intent)        │
└────────────────────┘    └────────────────────┘    └────────────────────┘
         │                         │                         │
         ▼                         ▼                         ▼
┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐
│    Redis Cache     │    │    RAG System      │    │   Translation      │
│    (Sessions)      │    │   (FAISS+ST)       │    │   (MarianMT)       │
└────────────────────┘    └────────────────────┘    └────────────────────┘
```

### 🔧 **Tech Stack**

| **Component**       | **Technology**                          | **Purpose**                          |
|---------------------|-----------------------------------------|--------------------------------------|
| **Frontend**        | Next.js 14, TypeScript, Tailwind CSS    | Modern, responsive UI                |
| **Backend**         | FastAPI, Python 3.11, Uvicorn          | High-performance API services        |
| **NLU Engine**      | Rasa 3.x                               | Intent recognition and dialogue      |
| **RAG System**      | SentenceTransformers, FAISS            | Document retrieval and search        |
| **Translation**     | MarianMT, Language Detection           | Multi-language support               |
| **Cache**           | Redis (Upstash)                        | Session management and caching       |
| **Database**        | Upstash Search                         | Document indexing and storage        |
| **Deployment**      | Docker, Kubernetes, NGINX              | Container orchestration              |
| **Monitoring**      | Prometheus, Grafana                    | System observability                 |

### 🎯 **Service Adapter Pattern**

The backend now uses a modular adapter pattern for all external services:

- **LLM Service**: `MockLLMService` (demo) ↔ `GeminiLLMService` (production)
- **Storage Service**: `LocalStorageService` (demo) ↔ `S3StorageService` (production)  
- **Auth Service**: `MockAuthService` (demo) ↔ `SupabaseAuthService` (production)
- **STT Service**: `MockSTTService` (demo) ↔ `RealSTTService` (production)
- **OCR Service**: `MockOCRService` (demo) ↔ `RealOCRService` (production)

Switch between modes using the `DEMO_MODE` environment variable.

---

## 📋 **API Documentation**

### 🗨️ **Chat Endpoints**

```bash
# Text chat interface
POST /api/v1/chat/text
{
  "message": "string"
}

# Voice chat interface  
POST /api/v1/chat/voice
# Audio file upload

# Document search
POST /api/v1/rag
{
  "query": "string",
  "lang": "string"
}

# Translation service
POST /api/v1/translate
{
  "text": "string", 
  "source_lang": "string",
  "target_lang": "string"
}
```

### 👩‍💼 **Admin Endpoints**

```bash
# Document management
POST /api/v1/documents/upload     # Upload new document
GET /api/v1/admin/stats          # System statistics (authenticated)
GET /api/v1/admin/health         # Health check endpoint
```

---

## 🌍 **Language Support**

| **Language** | **Code** | **Status**       | **Features**                     |
|--------------|----------|------------------|----------------------------------|
| **English**  | `en`     | ✅ Full          | Primary processing language      |
| **Hindi**    | `hi`     | ✅ Full          | Complete translation support     |
| **Marathi**  | `mr`     | ✅ Full          | MarianMT translation             |
| **Marwari**  | `mwr`    | ⚠️ Partial       | Fallback to Hindi/English        |

### **Adding New Languages**

1. Update `translation/language_detector.py`.
2. Add translation models in `translation/translator.py`.
3. Update UI selectors in `components/chat-interface.tsx`.
4. Retrain Rasa model with new language data.

---

## 📊 **Monitoring & Analytics**

### 📈 **Grafana Dashboard**
- **URL**: `http://localhost:3001`
- **Credentials**: `admin / admin123`
- **Metrics**: Response times, error rates, language usage

### 🔍 **Prometheus Metrics**
- **URL**: `http://localhost:9090`
- **Metrics**: System performance, API calls, cache hit rates

### 📋 **Performance Targets**

| **Metric**                  | **Target** | **Current** |
|-----------------------------|------------|-------------|
| Response Time (Cached)      | ≤ 2s       | ~1.2s       |
| Response Time (Cold)        | ≤ 5s       | ~3.8s       |
| Intent Accuracy             | ≥ 80%      | ~85%        |
| Translation Confidence      | ≥ 70%      | ~78%        |
| Uptime                     | ≥ 99.5%    | 99.7%       |

---

## 🧪 **Testing**

### **Manual Testing Checklist**

- [ ] **Multilingual Input**: Test Hindi, Marathi, Marwari queries.
- [ ] **Intent Recognition**: Validate fees, admission, timetable, courses.
- [ ] **Document Search**: Test RAG functionality across topics.
- [ ] **Human Handoff**: Verify volunteer notification system.
- [ ] **Admin Functions**: Test document upload and management.
- [ ] **Error Handling**: Test network failures and invalid inputs.
- [ ] **Performance**: Conduct load testing with concurrent users.
- [ ] **Demo/Production Mode**: Test service adapter switching

### **Automated Testing**

```bash
# Run backend test suite
cd backend && pytest tests/

# Run frontend test suite  
npm run test

# Test Rasa model
cd rasa && rasa test

# Performance testing
k6 run performance-tests.js
```

---

## 🚨 **Troubleshooting**

<details>
<summary><strong>🔴 Common Issues & Solutions</strong></summary>

### **FastAPI Server Issues**

```bash
# Check FastAPI server
cd backend && python -m uvicorn app.main:app --reload

# Test health endpoint
curl http://localhost:8000/api/v1/admin/health
```

### **Service Adapter Configuration**

```bash
# Check DEMO_MODE setting
echo $DEMO_MODE

# Verify environment variables
echo $GEMINI_API_KEY
echo $SUPABASE_URL
echo $S3_BUCKET_NAME
```

### **Redis Connection Issues**

```bash
# Check environment variables
echo $KV_REST_API_URL
echo $KV_REST_API_TOKEN

# Test Redis connectivity
docker-compose exec redis redis-cli ping
```

### **Rasa Model Problems**

```bash
# Retrain Rasa model
cd rasa && rasa train

# Check model loading
docker-compose logs rasa-server
```

### **Translation Service Errors**

```bash
# Check MarianMT model downloads
docker-compose logs flask-backend

# Verify language detection
curl -X POST http://localhost:8000/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "नमस्ते", "detect_language": true}'
```

### **Performance Issues**

```bash
# Monitor resource usage
docker stats

# Check application logs
docker-compose logs -f --tail=100

# Verify cache performance
redis-cli info stats
```

</details>

---

## 🤝 **Contributing**

We welcome contributions to enhance **Vidya Vaani**! Follow our contribution guidelines:

### **Development Workflow**

1. **Fork & Clone**

   ```bash
   git clone https://github.com/sahaj33-op/vidya-vaani-v0.git
   cd vidya-vaani-v0
   ```

2. **Create Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes & Test**

   ```bash
   # Make your changes
   npm run test
   cd backend && pytest tests/
   docker-compose -f docker-compose.dev.yml up --build
   ```

4. **Submit Pull Request**
   - Ensure all tests pass.
   - Update documentation.
   - Use clear, conventional commit messages.

### **Code Standards**

- **Frontend**: ESLint + Prettier for TypeScript/React.
- **Backend**: Black + isort for Python formatting.
- **Commits**: Follow conventional commit messages.
- **Documentation**: Update README for new features.

---

## 📄 **License & Credits**

### 📜 **License**
This project is licensed under the **[MIT License](LICENSE)**.

### 👥 **Team Fusion Six**

| **Role**              | **Contributor**                     | **GitHub**                       |
|-----------------------|-------------------------------------|----------------------------------|
| **Team Lead**         | [@sahaj33-op](https://github.com/sahaj33-op) | Full-stack development          |
| **Backend Developer** | [@sahaj33-op](https://github.com/sahaj33-op) | NLU & RAG systems               |
| **Frontend Developer**| [@sahaj33-op](https://github.com/sahaj33-op) | UI/UX design                    |
| **DevOps Engineer**   | [@sahaj33-op](https://github.com/sahaj33-op) | Infrastructure & deployment      |
| **ML Engineer**       | [@sahaj33-op](https://github.com/sahaj33-op) | Translation & model training     |
| **QA Engineer**       | [@sahaj33-op](https://github.com/sahaj33-op) | Testing & quality assurance      |

### 🏆 **Acknowledgments**

- **Smart India Hackathon 2025** for the opportunity.
- **Ministry of Education** for supporting educational innovation.
- **Open Source Community** for providing exceptional tools and libraries.
- **Our Mentors** for their guidance and support.

---

## 📞 **Contact & Support**

### 🐛 **Bug Reports**
- **GitHub Issues**: [Report a bug](https://github.com/sahaj33-op/vidya-vaani-v0/issues/new?template=bug_report.md)
- **Email**: [sahajitaliya33@gmail.com](mailto:sahajitaliya33@gmail.com)

### 💡 **Feature Requests**
- **GitHub Discussions**: [Request a feature](https://github.com/sahaj33-op/vidya-vaani-v0/discussions)
- **Email**: [sahajitaliya33@gmail.com](mailto:sahajitaliya33@gmail.com)

### 📧 **Team Contact**
- **Project Lead**: [sahajitaliya33@gmail.com](mailto:sahajitaliya33@gmail.com)
- **Technical Support**: [sahajitaliya33@gmail.com](mailto:sahajitaliya33@gmail.com)

---

<div align="center">

**Made with ❤️ by Team Fusion Six for Smart India Hackathon 2025**

[![GitHub Stars](https://img.shields.io/github/stars/sahaj33-op/vidya-vaani-v0?style=social)](https://github.com/sahaj33-op/vidya-vaani-v0/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/sahaj33-op/vidya-vaani-v0?style=social)](https://github.com/sahaj33-op/vidya-vaani-v0/network/members)
[![Follow](https://img.shields.io/github/followers/sahaj33-op?style=social)](https://github.com/sahaj33-op)

</div>
