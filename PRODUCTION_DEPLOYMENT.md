# 🚀 Production Deployment Guide - Vidya Vaani V0

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Deployment Options](#deployment-options)
4. [Configuration](#configuration)
5. [Database & Storage](#database--storage)
6. [Monitoring & Logging](#monitoring--logging)
7. [Security Checklist](#security-checklist)
8. [Performance Tuning](#performance-tuning)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services
- **Gemini API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Supabase Project**: Sign up at [supabase.com](https://supabase.com)
- **Redis Instance**: Use [Upstash](https://upstash.com) for serverless Redis
- **Domain**: For production deployment

### System Requirements
- **Backend**: Python 3.11+, 2GB RAM minimum, 10GB storage
- **Frontend**: Node.js 18+, 1GB RAM
- **Docker** (optional): Docker 20.10+, Docker Compose 2.0+

---

## Environment Setup

### 1. Clone and Configure

```bash
git clone <repository-url>
cd Vidya-vaani-V0
```

### 2. Backend Environment

```bash
cd backend
cp .env.production.example .env.production
```

Edit `.env.production` with your credentials:

```env
# REQUIRED
DEMO_MODE=false
NODE_ENV=production
GEMINI_API_KEY=your_actual_gemini_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_key

# RECOMMENDED
REDIS_ENABLED=true
REDIS_HOST=your-redis-host.upstash.io
REDIS_PASSWORD=your_redis_password
RATE_LIMIT_ENABLED=true
ENABLE_METRICS=true
LOG_LEVEL=INFO
```

### 3. Install Dependencies

**Production mode with MarianMT translation:**
```bash
pip install -r requirements.production.txt
```

This installs:
- FastAPI, Uvicorn (web framework)
- Transformers, PyTorch (MarianMT translation)
- SentenceTransformers, FAISS (RAG system)
- Prometheus, Sentry (monitoring)
- Redis client, security libraries

---

## Deployment Options

### Option 1: Docker Deployment (Recommended)

```bash
# Build and start all services
docker-compose -f docker-compose.production.yml up -d --build

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down
```

**Services Started:**
- Frontend (Next.js): http://localhost:3000
- Backend (FastAPI): http://localhost:8000
- Redis: localhost:6379
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin123)

### Option 2: Platform Deployment

#### **Vercel (Frontend)**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Environment variables in Vercel dashboard:
- `NEXT_PUBLIC_BACKEND_URL`: Your backend API URL
- `NEXT_PUBLIC_DEV_MODE`: false

#### **Railway/Render (Backend)**

1. Connect GitHub repository
2. Set environment variables from `.env.production.example`
3. Deploy command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Health check: `/api/v1/health/ready`

#### **Fly.io (Backend)**

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch app
fly launch

# Set secrets
fly secrets set GEMINI_API_KEY=xxx SUPABASE_URL=xxx

# Deploy
fly deploy
```

### Option 3: Manual Deployment

```bash
# Backend
cd backend
pip install -r requirements.production.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Frontend (separate terminal)
cd ..
npm run build
npm start
```

---

## Configuration

### Health Checks

**Liveness**: `GET /api/v1/health/live` (returns 200 if alive)  
**Readiness**: `GET /api/v1/health/ready` (checks dependencies)  
**Detailed**: `GET /api/v1/health/detailed` (disabled in production)

### Translation Service

**Enable MarianMT** (offline, free):
```env
TRANSLATION_PROVIDER=marian
```

Models auto-download on first use:
- `Helsinki-NLP/opus-mt-en-hi` (English↔Hindi)
- `Helsinki-NLP/opus-mt-en-mr` (English↔Marathi)

**Fallback**: Set `TRANSLATION_PROVIDER=mock` for demo mode

### Rate Limiting

```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_BURST=10
```

Excludes: `/health/*`, `/docs`, `/metrics`

### RAG System

**Default**: FAISS with local persistence (no config needed)

**Optional - Supabase pgvector** (for multi-server scale):
```env
USE_PGVECTOR=true
POSTGRES_CONNECTION_STRING=postgresql://...
```

---

## Database & Storage

### Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. Get API keys from Settings → API
3. Enable Storage for document uploads
4. Optional: Create pgvector extension for RAG

```sql
-- Optional: Enable pgvector for RAG
create extension if not exists vector;

-- Create table for RAG embeddings
create table documents (
  id uuid primary key default uuid_generate_v4(),
  content text,
  embedding vector(384),
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- Create index for fast similarity search
create index on documents using ivfflat (embedding vector_cosine_ops);
```

### Redis Cache

**Upstash Setup** (serverless):
1. Sign up at [upstash.com](https://upstash.com)
2. Create Redis database
3. Copy connection details to `.env.production`:

```env
REDIS_ENABLED=true
REDIS_HOST=your-db.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_TLS=true
```

**Self-hosted**:
```bash
docker run -d --name redis \
  -p 6379:6379 \
  redis:7-alpine redis-server --appendonly yes
```

---

## Monitoring & Logging

### Prometheus Metrics

Access at `/metrics` endpoint:
- HTTP request counts, durations, errors
- LLM API requests (provider, status)
- Translation requests
- RAG search performance

**Grafana Dashboard**:
1. Access http://localhost:3001 (admin/admin123)
2. Add Prometheus datasource: http://prometheus:9090
3. Import dashboard or create custom views

### Sentry Error Tracking (Optional)

```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

Install:
```bash
pip install sentry-sdk[fastapi]
```

### Logging

**Text format** (development):
```env
LOG_FORMAT=text
LOG_LEVEL=INFO
```

**JSON format** (production - for log aggregators):
```env
LOG_FORMAT=json
LOG_LEVEL=WARNING
```

---

## Security Checklist

### ✅ Pre-Deployment

- [ ] Set `DEMO_MODE=false`
- [ ] Set `NODE_ENV=production`
- [ ] Generate strong `SECRET_KEY`: `openssl rand -hex 32`
- [ ] Configure `ALLOWED_ORIGINS` (no wildcards in production)
- [ ] Enable `RATE_LIMIT_ENABLED=true`
- [ ] Set secure Redis password
- [ ] Use HTTPS for all services
- [ ] Store secrets in environment variables (never commit to git)
- [ ] Review and update Supabase RLS policies
- [ ] Disable API docs in production (auto-disabled when `is_production=true`)

### 🔒 HTTPS Setup

**With NGINX**:
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**With Cloudflare**:
- Enable "Always Use HTTPS"
- Enable "Automatic HTTPS Rewrites"
- Set SSL/TLS to "Full (strict)"

---

## Performance Tuning

### Backend Scaling

**Uvicorn workers** (CPU cores × 2 + 1):
```bash
uvicorn app.main:app --workers 4 --host 0.0.0.0 --port 8000
```

**Gunicorn + Uvicorn**:
```bash
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Caching Strategy

- **Redis**: Query results (30 min TTL), translations (7 days)
- **In-memory**: Embeddings model, MarianMT models (auto-cached)
- **CDN**: Static assets, frontend builds

### Database Optimization

- Enable connection pooling: `pool_size=20, max_overflow=10`
- Index frequently queried fields
- Use pgvector IVFFlat index for RAG (faster than sequential scan)

---

## Troubleshooting

### Backend Won't Start

**Error**: "Missing required configuration"
- Check all `REQUIRED` env vars in `.env.production`
- Verify API keys are valid

**Error**: "Redis connection failed"
- Check `REDIS_HOST`, `REDIS_PASSWORD`
- If not using Redis, set `REDIS_ENABLED=false`

**Error**: "MarianMT models not found"
- Models download on first use (requires internet)
- Check disk space (~500MB per model)
- Set `TRANSLATION_PROVIDER=mock` to bypass

### Health Check Fails

```bash
curl http://localhost:8000/api/v1/health/ready
```

Check response:
- `gemini: not_configured` → Set GEMINI_API_KEY
- `redis: unhealthy` → Check Redis connection
- `ready: false` → Review logs for specific error

### High Memory Usage

- Reduce Uvicorn workers
- Disable MarianMT (use `mock` provider)
- Use smaller embedding model
- Enable Redis caching to reduce recomputation

### Slow Response Times

- Enable Redis caching
- Check Gemini API rate limits
- Review Prometheus metrics at `/metrics`
- Optimize RAG index (rebuild with more clusters)

---

## Deployment Checklist

### Pre-Launch
- [ ] Run tests: `pytest backend/tests/`
- [ ] Build frontend: `npm run build`
- [ ] Test health endpoints
- [ ] Load test with expected traffic
- [ ] Configure monitoring alerts

### Post-Launch
- [ ] Monitor `/metrics` endpoint
- [ ] Check error logs (Sentry/CloudWatch)
- [ ] Verify Redis cache hit rate
- [ ] Test user flows in production
- [ ] Set up automated backups (Supabase, Redis)
- [ ] Document incident response procedures

---

## Support

- **Issues**: [GitHub Issues](https://github.com/your-org/vidya-vaani/issues)
- **Documentation**: [Full Docs](https://docs.your-domain.com)
- **Email**: support@your-domain.com

---

**Last Updated**: 2025-12-31  
**Version**: 1.0.0
