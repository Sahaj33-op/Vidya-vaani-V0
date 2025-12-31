# 🚀 Deployment Guide - Vidya Vaani

## Quick Start for Production

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- Git
- Accounts: Vercel, Railway/Render (or Fly.io), Supabase, Upstash (optional)

---

## 1. Environment Setup

### Backend (.env)
1. Copy `backend/.env.production.example` to `backend/.env`
2. Fill in required values:
   ```bash
   DEMO_MODE=false
   GEMINI_API_KEY=your_key
   SUPABASE_URL=your_url
   SUPABASE_ANON_KEY=your_key
   SUPABASE_SERVICE_KEY=your_key
   ```

### Frontend (.env.local)
1. Create `.env.local` in project root:
   ```bash
   NEXT_PUBLIC_DEV_MODE=false
   NEXT_PUBLIC_BACKEND_URL=https://your-backend.railway.app
   KV_REST_API_URL=https://your-redis.upstash.io
   KV_REST_API_TOKEN=your_token
   ```

---

## 2. Backend Deployment (Railway)

### Option A: Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Deploy backend
cd backend
railway up

# Set environment variables
railway variables set DEMO_MODE=false
railway variables set GEMINI_API_KEY=your_key
# ... (set all variables from .env.production.example)
```

### Option B: Render
1. Create new Web Service
2. Connect GitHub repo
3. Set build command: `cd backend && pip install -r requirements.txt`
4. Set start command: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables from dashboard

### Option C: Fly.io
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Launch app
cd backend
flyctl launch

# Set secrets
flyctl secrets set GEMINI_API_KEY=your_key
```

---

## 3. Frontend Deployment (Vercel)

### Using Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_BACKEND_URL
vercel env add KV_REST_API_URL
vercel env add KV_REST_API_TOKEN
```

### Using Vercel Dashboard
1. Import GitHub repository
2. Framework: Next.js
3. Root Directory: `./`
4. Add environment variables
5. Deploy

---

## 4. Database Setup (Supabase)

### Create Supabase Project
1. Go to https://supabase.com
2. Create new project
3. Enable pgvector extension (for vector storage):
   ```sql
   create extension if not exists vector;
   ```

### Create Tables (Optional - for future features)
```sql
-- Documents table
create table documents (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  content text not null,
  embedding vector(384),
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- Query logs table
create table query_logs (
  id uuid default uuid_generate_v4() primary key,
  query text not null,
  language text,
  response_time_ms integer,
  success boolean,
  created_at timestamp with time zone default now()
);
```

---

## 5. Redis Setup (Upstash) - Optional

1. Go to https://upstash.com
2. Create Redis database
3. Copy REST URL and token
4. Add to environment variables

---

## 6. Post-Deployment Checklist

### Backend Health Check
```bash
curl https://your-backend-url.railway.app/api/v1/admin/health
```

### Frontend Verification
1. Visit your Vercel URL
2. Test chat functionality
3. Try voice input (if enabled)
4. Upload a document (if admin access)

### Performance Testing
```bash
# Test response time
curl -X POST https://your-backend-url/api/v1/chat/text \
  -H "Content-Type: application/json" \
  -d '{"message":"What are the admission fees?","language":"en"}'
```

---

## 7. Monitoring & Logging

### Sentry Setup (Recommended)
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs

# Backend
pip install sentry-sdk
```

### Environment Variables
```bash
SENTRY_DSN=your_sentry_dsn
```

---

## 8. CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        run: vercel --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

---

## 9. Scaling Considerations

### Backend Scaling
- Railway: Auto-scales based on usage
- Render: Upgrade to Standard plan for auto-scaling
- Fly.io: Configure scale settings in fly.toml

### Database Optimization
- Enable Supabase connection pooling
- Add indexes on frequently queried columns
- Use Redis for caching

### CDN & Caching
- Vercel automatically provides CDN
- Enable Redis for API response caching
- Configure appropriate cache headers

---

## 10. Security Best Practices

✅ **Completed:**
- Environment variables not in git
- CORS configured
- Input validation with Pydantic

⚠️ **TODO:**
- [ ] Enable rate limiting
- [ ] Add API authentication
- [ ] Set up WAF (Web Application Firewall)
- [ ] Regular security audits
- [ ] SSL/TLS certificates (automatic with Vercel/Railway)

---

## 11. Cost Estimation

### Free Tier (Development/Testing)
- Vercel: Free
- Railway: $5/month free credit
- Supabase: Free tier (500MB database)
- Upstash: Free tier (10K requests/day)

### Production (Expected)
- Vercel Pro: $20/month
- Railway: ~$20/month (2GB RAM)
- Supabase: ~$25/month (8GB database)
- Upstash: ~$10/month
- **Total: ~$75/month**

---

## 12. Troubleshooting

### Backend not responding
1. Check Railway logs: `railway logs`
2. Verify environment variables
3. Check database connection

### Frontend errors
1. Check Vercel deployment logs
2. Verify NEXT_PUBLIC_BACKEND_URL
3. Check browser console

### Performance issues
1. Enable Redis caching
2. Check Supabase query performance
3. Monitor with Sentry

---

## Support

For issues:
1. Check GitHub Issues
2. Review logs in Railway/Vercel
3. Contact: support@vidyavaani.com (if available)
