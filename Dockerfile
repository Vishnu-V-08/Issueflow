# =============================================================================
# IssueFlow Frontend - Production Dockerfile
# Multi-stage: Node.js 20 Alpine Builder -> Nginx 1.27 Alpine Production Server
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build React + Vite SPA
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json ./

# Clean install of npm dependencies
RUN npm ci

# Accept backend API base URL as a build-time argument (defaults to local backend)
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copy source code, configs, and public assets
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY vite.config.ts postcss.config.js tailwind.config.js index.html ./
COPY public/ ./public/
COPY src/ ./src/

# Build optimized production bundle
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Serve with Nginx Alpine
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

# Remove default nginx HTML files
RUN rm -rf /usr/share/nginx/html/*

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with SPA routing fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Health check using lightweight endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://localhost/nginx-health || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

