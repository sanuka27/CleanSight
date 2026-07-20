"""
CleanSight ML Combined Service
===============================
Serves both Phase 1 (binary) and Phase 2 (category) endpoints on a single
FastAPI app so the entire ML backend fits in one Render web service slot.

Endpoints:
  GET  /health              → service health
  POST /predict             → Phase 1: trash / non-trash
  POST /predict-category    → Phase 2: glass / paper / plastic / mixed
"""

from __future__ import annotations

import logging
import os
import sys
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Make sure the repo root is on sys.path so "ML.*" imports resolve correctly
# whether running locally or on Render.
# ---------------------------------------------------------------------------
_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from ML.config.settings import settings  # noqa: E402
from ML.service.image_input import extract_image_bytes  # noqa: E402
from ML.service.model_loader import load_model as load_binary_model  # noqa: E402
from ML.service.model_loader import predict_image_contract  # noqa: E402
from ML.service.schemas import PredictionResponse  # noqa: E402
from ML.category_service.model_loader import load_model as load_category_model  # noqa: E402
from ML.category_service.model_loader import predict_category  # noqa: E402
from ML.category_service.schemas import CategoryPrediction, CategoryPredictionResponse  # noqa: E402

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="CleanSight ML Service",
    description="Combined Phase 1 (binary) + Phase 2 (category) waste classification",
    version="1.0.0",
)

# Allow requests from the Render backend and Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Startup – load both models once
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup_event():
    logging.info("Loading Phase 1 (binary) model…")
    load_binary_model()

    logging.info("Loading Phase 2 (category) model…")
    load_category_model()

    logging.info("ML service ready.")


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "service": "cleansight-ml-combined"}


# ---------------------------------------------------------------------------
# Phase 1 – binary waste / non-waste
# ---------------------------------------------------------------------------

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
            status_code = (
                503 if error_type == "model_unavailable"
                else 400 if error_type == "invalid_image"
                else 500
            )
            raise HTTPException(status_code=status_code, detail=result.get("error"))

        return PredictionResponse(**result)

    except HTTPException:
        raise
    except Exception as exc:
        logging.exception("Phase 1 prediction failed")
        raise HTTPException(status_code=500, detail=f"Internal error: {exc}") from exc


# ---------------------------------------------------------------------------
# Phase 2 – waste category
# ---------------------------------------------------------------------------

@app.post("/predict-category", response_model=CategoryPredictionResponse)
async def predict_category_endpoint(
    image: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
):
    """Predict waste category (glass / paper / plastic / mixed)."""
    logging.info("Phase 2 category prediction request received")

    try:
        image_bytes = await extract_image_bytes(
            image=image,
            image_url=image_url,
            max_image_bytes=settings.max_image_bytes,
        )

        result = predict_category(image_bytes)
        if not result.get("success"):
            return CategoryPredictionResponse(
                success=False,
                isWaste=True,
                category=None,
                predicted_class=None,
                confidence=0.0,
                entropy=1.0,
                confidence_level="VERY LOW",
                review_status="manual_review",
                all_predictions=[],
                error=result.get("error", "Prediction failed"),
            )

        all_predictions = [
            CategoryPrediction(class_name=item["class_name"], confidence=item["confidence"])
            for item in result.get("all_predictions", [])
        ]

        return CategoryPredictionResponse(
            success=True,
            isWaste=True,
            category=result.get("category"),
            predicted_class=result.get("predicted_class"),
            confidence=result.get("confidence"),
            entropy=result.get("entropy"),
            confidence_level=result.get("confidence_level"),
            review_status=result.get("review_status"),
            all_predictions=all_predictions,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logging.exception("Phase 2 category prediction failed")
        raise HTTPException(status_code=500, detail=f"Internal error: {exc}") from exc
