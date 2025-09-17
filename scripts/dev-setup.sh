#!/bin/bash

# Development environment setup script
set -e

echo "🛠️ Setting up development environment..."

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
# Redis Configuration (Upstash)
KV_REST_API_URL=your_redis_url_here
KV_REST_API_TOKEN=your_redis_token_here

# Upstash Search Configuration
UPSTASH_SEARCH_REST_URL=your_search_url_here
UPSTASH_SEARCH_REST_TOKEN=your_search_token_here

# Development Settings
NODE_ENV=development
FLASK_ENV=development
EOF
    echo "⚠️ Please update .env.local with your actual environment variables"
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Build and start development environment
echo "🚀 Starting development environment..."
docker-compose -f docker-compose.dev.yml up --build -d

echo "✅ Development environment is ready!"
echo "🌐 Next.js app: http://localhost:3000"
echo "🤖 Rasa server: http://localhost:5005"
echo "🐍 Flask backend: http://localhost:8000"
echo "📊 Redis: localhost:6379"

echo ""
echo "📋 Useful commands:"
echo "  - View logs: docker-compose -f docker-compose.dev.yml logs -f"
echo "  - Stop services: docker-compose -f docker-compose.dev.yml down"
echo "  - Rebuild: docker-compose -f docker-compose.dev.yml up --build"
