# Production Dockerfile for Pan Pan Comenzi React SPA
# Serves the pre-compiled production application using lightweight, high-performance Nginx
FROM nginx:alpine

# Clean default welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy pre-compiled production assets directly
# Eliminates all Node.js / compiler / ARM64 memory and architecture issues on the server
COPY dist /usr/share/nginx/html

# Copy custom Nginx configuration with SPA routing and security headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
