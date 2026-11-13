# =============================================================================
# IssueFlow Frontend - Production Dockerfile (frontend/Dockerfile)
# Multi-stage: Node.js 20 Alpine Builder -> Nginx 1.27 Alpine Production Server
# =============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY vite.config.ts postcss.config.js tailwind.config.js index.html ./
COPY public/ ./public/
COPY src/ ./src/

RUN npm run build

FROM nginx:1.27-alpine AS runner

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://localhost/nginx-health || exit 1

CMD ["nginx", "-g", "daemon off;"]

