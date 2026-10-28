# Multi-stage Dockerfile for Pan Pan Comenzi React SPA

# Stage 1: Build the React application
FROM node:22-slim AS builder

WORKDIR /app

# Ensure devDependencies are installed and limit memory to avoid VPS OOM killer
ENV NODE_ENV=development
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Environment variables injected as build args (from Portainer or .env)
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_DATABASE_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_OAUTH_CLIENT_ID

ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_DATABASE_ID=$VITE_FIREBASE_DATABASE_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_OAUTH_CLIENT_ID=$VITE_FIREBASE_OAUTH_CLIENT_ID

# Copy package.json
COPY package.json ./
RUN npm install --legacy-peer-deps --include=dev --include=optional --no-audit

# Workaround for npm bug #4828:
# Explicitly install the native Rolldown binary for the exact CPU architecture (ARM64 vs x86_64)
RUN ARCH=$(uname -m) && \
    echo "Current CPU architecture: $ARCH" && \
    if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then \
      npm install @rolldown/binding-linux-arm64-gnu@1.2.14 --no-save --legacy-peer-deps || true; \
    else \
      npm install @rolldown/binding-linux-x64-gnu@1.2.14 --no-save --legacy-peer-deps || true; \
    fi

# Copy source files
COPY . .

# Build production bundle (outputs to /app/dist)
RUN npm run build

# Stage 2: Serve using high-performance lightweight Nginx
FROM nginx:alpine

# Remove default Nginx welcome site
RUN rm -rf /usr/share/nginx/html/*

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with SPA fallback and security headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
