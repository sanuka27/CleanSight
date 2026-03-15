import os
import io
import requests
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from .schemas import PredictionResponse
from .model_loader import load_model, predict_image
from typing import Optional

app = FastAPI(title="CleanSight ML Phase 1 - Binary Validation")

# Load model on startup
@app.on_event("startup")
async def startup_event():
    load_model()

@app.post("/predict", response_model=PredictionResponse)
async def predict_endpoint(image: Optional[UploadFile] = File(None), image_url: Optional[str] = Form(None)):
    """
    Accepts an image file or an image URL to download.
    Provides real prediction using the loaded Phase 1 model.
    """
    import logging
    logging.info(f"Received prediction request. URL: {image_url}")
    
    try:
        image_bytes = None
        
        if image:
            image_bytes = await image.read()
        elif image_url:
            response = requests.get(image_url, timeout=10)
            if response.status_code == 200:
                image_bytes = response.content
            else:
                raise HTTPException(status_code=400, detail="Could not retrieve image from provided URL")
        else:
            raise HTTPException(status_code=400, detail="Must provide 'image' file or 'image_url'")
            
        label, confidence = predict_image(image_bytes)
        
        # Decide recommendation (Confidence threshold: 0.70)
        THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", 0.70))
        recommendation = "automated_approval" if confidence >= THRESHOLD else "manual_review"
        
        return PredictionResponse(
            label=label,
            confidence=confidence,
            recommendation=recommendation
        )
        
    except RuntimeError as re:
        raise HTTPException(status_code=500, detail=str(re))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal service error: {str(e)}")

# Add a simple health check
@app.get("/health")
def health_endpoint():
    return {"status": "ok"}
