from __future__ import annotations

import logging
import os
import sys
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from .image_input import extract_image_bytes
from .model_loader import load_model, predict_image_contract
from .schemas import PredictionResponse


try:
    from ML.config.settings import settings
except ImportError:
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    if PROJECT_ROOT not in sys.path:
        sys.path.insert(0, PROJECT_ROOT)
    from ML.config.settings import settings


app = FastAPI(title="CleanSight ML Phase 1 - Binary Validation")


@app.on_event("startup")
async def startup_event():
    load_model()


@app.post("/predict", response_model=PredictionResponse)
async def predict_endpoint(
    image: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
):
    """Predict whether the input image contains waste."""
    logging.info("Phase 1 prediction request received")

    try:
        image_bytes = await extract_image_bytes(
            image=image,
            image_url=image_url,
            max_image_bytes=settings.max_image_bytes,
        )

        result = predict_image_contract(image_bytes)
        if not result.get("success"):
            error_type = result.get("errorType")
            status_code = 503 if error_type == "model_unavailable" else 400 if error_type == "invalid_image" else 500
            raise HTTPException(status_code=status_code, detail=result.get("error", "Model service unavailable"))

        return PredictionResponse(**result)
    except HTTPException:
        raise
    except Exception as exc:
        logging.exception("Phase 1 prediction failed")
        raise HTTPException(status_code=500, detail=f"Internal service error: {exc}") from exc


@app.get("/health")
def health_endpoint():
    return {"status": "ok", "service": "binary-validation"}
