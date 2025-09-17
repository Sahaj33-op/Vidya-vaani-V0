# Deployment Guide for VidyaVaani

This document provides detailed instructions for deploying the VidyaVaani application in various environments.

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local deployment)
- Redis instance (Upstash recommended for production)
- GitHub account (for CI/CD pipeline)

## Environment Variables

Create a `.env.local` file for local development or set these environment variables in your deployment platform:

```
# Required
KV_REST_API_URL=your_redis_url
KV_REST_API_TOKEN=your_redis_token

# Optional
NODE_ENV=production  # Set to 'development' for local development
```

## Deployment Options

### 1. Docker Deployment (Recommended for Production)

The application includes a multi-stage Dockerfile optimized for production use:

```bash
# Build the Docker image
docker build -t vidya-vaani:latest .

# Run the container
docker run -p 3000:3000 --env-file .env.local vidya-vaani:latest
```

Access the application at `http://localhost:3000`

### 2. Local Development Deployment

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Access the application at `http://localhost:3000`

### 3. Production Deployment with Worker

For production environments, you'll need to run both the Next.js application and the background worker:

```bash
# Terminal 1: Run the Next.js application
npm run build
npm start

# Terminal 2: Run the background worker
node dist/worker/indexer.js
```

### 4. CI/CD with GitHub Actions

The repository includes a GitHub Actions workflow for continuous integration and deployment:

1. Push changes to the `main` branch
2. GitHub Actions will automatically:
   - Run tests
   - Build the application
   - Build and push a Docker image to GitHub Container Registry

To use this pipeline:

1. Add the following secrets to your GitHub repository:
   - `KV_REST_API_URL_TEST`: Redis URL for testing
   - `KV_REST_API_TOKEN_TEST`: Redis token for testing

2. Pull the latest image from GitHub Container Registry:
   ```bash
   docker pull ghcr.io/your-username/vidya-vaani:latest
   ```

## Kubernetes Deployment

For scaling in production, deploy to Kubernetes:

1. Create Kubernetes deployment files:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vidya-vaani
spec:
  replicas: 2
  selector:
    matchLabels:
      app: vidya-vaani
  template:
    metadata:
      labels:
        app: vidya-vaani
    spec:
      containers:
      - name: vidya-vaani
        image: ghcr.io/your-username/vidya-vaani:latest
        ports:
        - containerPort: 3000
        env:
        - name: KV_REST_API_URL
          valueFrom:
            secretKeyRef:
              name: redis-secrets
              key: url
        - name: KV_REST_API_TOKEN
          valueFrom:
            secretKeyRef:
              name: redis-secrets
              key: token
---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: vidya-vaani
spec:
  selector:
    app: vidya-vaani
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

2. Create secrets:
```bash
kubectl create secret generic redis-secrets \
  --from-literal=url=your_redis_url \
  --from-literal=token=your_redis_token
```

3. Apply the configuration:
```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```

## Worker Deployment

For production, deploy the background worker separately:

```yaml
# worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vidya-vaani-worker
spec:
  replicas: 1
  selector:
    matchLabels:
      app: vidya-vaani-worker
  template:
    metadata:
      labels:
        app: vidya-vaani-worker
    spec:
      containers:
      - name: worker
        image: ghcr.io/your-username/vidya-vaani:latest
        command: ["node", "dist/worker/indexer.js"]
        env:
        - name: KV_REST_API_URL
          valueFrom:
            secretKeyRef:
              name: redis-secrets
              key: url
        - name: KV_REST_API_TOKEN
          valueFrom:
            secretKeyRef:
              name: redis-secrets
              key: token
```

Apply the worker deployment:
```bash
kubectl apply -f worker-deployment.yaml
```

## Monitoring and Maintenance

- **Logs**: Access container logs with `docker logs` or through Kubernetes dashboard
- **Scaling**: Adjust replicas in Kubernetes deployment for horizontal scaling
- **Updates**: Use rolling updates in Kubernetes to minimize downtime

## Troubleshooting

1. **Redis Connection Issues**:
   - Verify Redis credentials are correct
   - Check network connectivity to Redis instance
   - Ensure Redis instance has sufficient memory

2. **Worker Not Processing Documents**:
   - Check worker logs for errors
   - Verify Redis queue is receiving documents
   - Ensure worker has sufficient resources

3. **Application Performance Issues**:
   - Consider scaling up application instances
   - Monitor Redis memory usage and performance
   - Check for slow API routes and optimize as needed