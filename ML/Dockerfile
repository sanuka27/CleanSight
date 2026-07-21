# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# ML Dockerfile
# ─────────────────────────────────────────────────────────────────────────────

# Use a slim Python 3.11 image
FROM python:3.11-slim AS base
WORKDIR /app/ML

# Install system dependencies required by some ML libraries (like OpenCV/Pillow if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY ML/render_service/requirements.txt ./render_service/requirements.txt

# Install dependencies
RUN pip install --no-cache-dir -r render_service/requirements.txt

# Copy ML application code
COPY ML/ ./

EXPOSE 8000

# Stage: Development (with reload)
FROM base AS development
CMD ["uvicorn", "render_service.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Stage: Production
FROM base AS production
CMD ["uvicorn", "render_service.main:app", "--host", "0.0.0.0", "--port", "8000"]
