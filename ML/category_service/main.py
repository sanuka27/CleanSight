"""FastAPI app for Phase 2 waste category classification."""

from __future__ import annotations

import logging
import os
import sys
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from .model_loader import load_model, predict_category
from .schemas import CategoryPrediction, CategoryPredictionResponse


try:
    from ML.config.settings import settings
    from ML.service.image_input import extract_image_bytes
except ImportError:
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    if PROJECT_ROOT not in sys.path:
        sys.path.insert(0, PROJECT_ROOT)
    from ML.config.settings import settings
    from ML.service.image_input import extract_image_bytes


app = FastAPI(
    title="CleanSight ML Phase 2 - Category Classification",
    description="Waste category classification service (glass, mixed, paper, plastic)",
    version="1.1.0",
)


@app.on_event("startup")
async def startup_event():
    load_model()


@app.post("/predict-category", response_model=CategoryPredictionResponse)
async def predict_category_endpoint(
    image: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
):
    """Predict waste category from uploaded image or remote URL."""
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
        raise HTTPException(status_code=500, detail=f"Internal service error: {exc}") from exc


@app.get("/health")
def health_endpoint():
    return {"status": "ok", "service": "category-classification"}
