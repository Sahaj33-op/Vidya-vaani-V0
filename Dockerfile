# Multi-stage build for Next.js application
FROM node:18-alpine AS base

# Stage 1: Install all dependencies (including dev dependencies)
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install ALL dependencies (dev + production)
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Build the application with full dependencies
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application with all dependencies available
RUN npm run build

# Stage 3: Production image, copy only necessary runtime artifacts
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only the necessary public files
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user for better security
USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Start the Next.js application
CMD ["node", "server.js"]
