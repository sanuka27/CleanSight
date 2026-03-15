from pydantic import BaseModel
from typing import Optional

class PredictionResponse(BaseModel):
    label: str
    confidence: float
    recommendation: str
    error: Optional[str] = None
