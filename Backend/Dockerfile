# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Backend Dockerfile
# ─────────────────────────────────────────────────────────────────────────────

# Stage 1: Base
FROM node:18-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
# Copy root configs and backend package
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY Backend/package.json ./Backend/

# Stage 2: Development
FROM base AS development
# We use pnpm to install all deps
RUN pnpm install --frozen-lockfile
COPY Backend/ ./Backend/
WORKDIR /app/Backend
EXPOSE 5000
CMD ["pnpm", "run", "dev"]

# Stage 3: Production
FROM base AS production
# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod
COPY Backend/ ./Backend/
WORKDIR /app/Backend
EXPOSE 5000
CMD ["pnpm", "run", "start"]
