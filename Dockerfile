# Multi-stage Dockerfile for Pan Pan Comenzi React SPA

# Stage 1: Build the React application using standard glibc Node environment
FROM node:22-slim AS builder

WORKDIR /app

# Ensure devDependencies are installed even if host has NODE_ENV=production
ENV NODE_ENV=development

# Install dependencies first for efficient layer caching
COPY package*.json ./
RUN npm install --legacy-peer-deps --include=dev

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
