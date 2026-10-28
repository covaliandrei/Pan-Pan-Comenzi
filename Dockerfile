# Multi-stage Dockerfile for Pan Pan Comenzi React SPA
# Stage 1: Build the React application using Bun Debian (glibc, 100% ARM64/AMD64 compatible)
FROM oven/bun:debian AS builder

WORKDIR /app

# Accept environment variables from Portainer / docker-compose
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

# Copy package definitions
COPY package.json ./

# Fast, clean dependency installation with native platform resolution
RUN bun install

# Copy source code and configuration
COPY . .

# Build production bundle (generates /app/dist)
RUN bun run build

# Stage 2: Serve using lightweight, high-performance Nginx
FROM nginx:alpine

# Clean default welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with SPA fallback and security headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
