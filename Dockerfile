# Multi-stage Dockerfile for Pan Pan Comenzi React SPA
# Stage 1: Build the React application using Bun (native ARM64 & AMD64 support, no npm optional-deps bugs)
FROM oven/bun:alpine AS builder

WORKDIR /app

# Copy package definitions
COPY package.json bun.lock* ./

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
