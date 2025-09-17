#!/bin/bash

# Deployment script for multilingual education chatbot
set -e

echo "🚀 Starting deployment of Multilingual Education Chatbot..."

# Check if required environment variables are set
if [ -z "$KV_REST_API_URL" ] || [ -z "$KV_REST_API_TOKEN" ]; then
    echo "❌ Error: Redis environment variables not set"
    echo "Please set KV_REST_API_URL and KV_REST_API_TOKEN"
    exit 1
fi

# Build Docker images
echo "📦 Building Docker images..."
docker build -t multilingual-chatbot/nextjs:latest .
docker build -t multilingual-chatbot/rasa:latest ./rasa
docker build -t multilingual-chatbot/backend:latest -f backend/Dockerfile .

# Create Kubernetes namespace
echo "🔧 Setting up Kubernetes namespace..."
kubectl apply -f k8s/namespace.yaml

# Apply ConfigMaps and Secrets
echo "⚙️ Applying configuration..."
kubectl apply -f k8s/configmap.yaml

# Create secrets (you need to encode values first)
echo "🔐 Creating secrets..."
echo "Please update k8s/secrets.yaml with base64 encoded values before applying"
# kubectl apply -f k8s/secrets.yaml

# Deploy services
echo "🚀 Deploying services..."
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/nextjs-deployment.yaml
kubectl apply -f k8s/rasa-deployment.yaml
kubectl apply -f k8s/ingress.yaml

# Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/redis-deployment -n multilingual-chatbot
kubectl wait --for=condition=available --timeout=300s deployment/nextjs-deployment -n multilingual-chatbot
kubectl wait --for=condition=available --timeout=300s deployment/rasa-deployment -n multilingual-chatbot

echo "✅ Deployment completed successfully!"
echo "🌐 Access your application at: https://chatbot.yourdomain.com"
echo "📊 Grafana dashboard: http://localhost:3001 (admin/admin123)"
echo "📈 Prometheus: http://localhost:9090"
