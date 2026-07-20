# ─────────────────────────────────────────────────────────────────
# CleanSight ML Phase 2 – Category Classifier
# Hugging Face Spaces Docker image
# ─────────────────────────────────────────────────────────────────

FROM python:3.11-slim

# ── System deps ──────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# ── App directory ─────────────────────────────────────────────────
WORKDIR /app
RUN useradd -m -u 1000 appuser && chown appuser:appuser /app
USER appuser

# ── Python dependencies ───────────────────────────────────────────
COPY --chown=appuser:appuser requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# ── Application code ──────────────────────────────────────────────
COPY --chown=appuser:appuser . /app/ML

# ── HF Spaces listens on 7860 ─────────────────────────────────────
EXPOSE 7860

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "ML.category_service.main:app", "--host", "0.0.0.0", "--port", "7860"]
