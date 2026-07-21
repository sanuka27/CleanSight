# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Frontend Dockerfile
# ─────────────────────────────────────────────────────────────────────────────

# Stage 1: Base
FROM node:18-alpine AS base
# pnpm setup
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
# We only copy the root workspace configs and frontend package
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY Frontend/package.json ./Frontend/

# Stage 2: Development
FROM base AS development
# Install all dependencies including dev
RUN pnpm install --frozen-lockfile
COPY Frontend/ ./Frontend/
WORKDIR /app/Frontend
EXPOSE 8080
# Run the dev server
CMD ["pnpm", "run", "dev", "--host"]

# Stage 3: Builder
FROM base AS builder
RUN pnpm install --frozen-lockfile
COPY Frontend/ ./Frontend/
WORKDIR /app/Frontend
RUN pnpm run build

# Stage 4: Production
FROM nginx:alpine AS production
COPY --from=builder /app/Frontend/dist /usr/share/nginx/html
# Custom nginx config could be copied here if we had one
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
