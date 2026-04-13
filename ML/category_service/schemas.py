from pydantic import BaseModel
from typing import Optional, List


class CategoryPrediction(BaseModel):
    class_name: str
    confidence: float


class CategoryPredictionResponse(BaseModel):
    success: bool
    isWaste: Optional[bool] = True
    category: Optional[str] = None
    predicted_class: Optional[str] = None
    confidence: Optional[float] = None
    entropy: Optional[float] = None
    confidence_level: Optional[str] = None
    review_status: Optional[str] = None
    all_predictions: Optional[List[CategoryPrediction]] = None
    error: Optional[str] = None
