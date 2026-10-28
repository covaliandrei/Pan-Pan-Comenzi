# Multi-stage Dockerfile for Pan Pan Comenzi React SPA

# Stage 1: Build the React application
FROM node:22-slim AS builder

WORKDIR /app

# Ensure devDependencies are installed and limit memory to avoid VPS OOM killer
ENV NODE_ENV=development
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Copy ONLY package.json.
# Skipping architecture-specific package-lock.json allows npm to automatically download
# the correct native bindings for ARM64 (aarch64) or AMD64 (x86_64), fixing npm bug #4828.
COPY package.json ./
RUN npm install --legacy-peer-deps --include=dev --no-audit

# Copy all source files and configuration
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
