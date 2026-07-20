# ─────────────────────────────────────────────────────────────────
# CleanSight ML Phase 1 – Binary Classifier
# Hugging Face Spaces Docker image
#
# HF Spaces runs containers as a non-root user (UID 1000) and
# exposes them on port 7860.  We honour both constraints here.
# ─────────────────────────────────────────────────────────────────

FROM python:3.11-slim

# ── System deps ──────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# ── App directory (HF runs as uid 1000) ──────────────────────────
WORKDIR /app
RUN useradd -m -u 1000 appuser && chown appuser:appuser /app
USER appuser

# ── Python dependencies ───────────────────────────────────────────
COPY --chown=appuser:appuser requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# ── Application code ──────────────────────────────────────────────
# Copy the entire ML package so internal imports (ML.config, ML.inference, …)
# resolve correctly inside the container.
COPY --chown=appuser:appuser . /app/ML

# ── Model files are expected at /app/ML/models/ ───────────────────
# (uploaded separately via HF Spaces Git LFS or the Files tab)

# ── HF Spaces listens on 7860 ─────────────────────────────────────
EXPOSE 7860

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "ML.service.main:app", "--host", "0.0.0.0", "--port", "7860"]
