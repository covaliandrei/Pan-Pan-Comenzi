# Multi-stage Dockerfile for Pan Pan Comenzi React SPA

# Stage 1: Build the React application
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies with legacy peer deps for reliable resolution
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy all source files and configurations
COPY . .

# Build production bundle (outputs to /app/dist)
RUN npm run build

# Stage 2: Serve using high-performance Nginx
FROM nginx:alpine

# Remove default Nginx welcome site
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with SPA fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
