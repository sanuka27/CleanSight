from typing import Optional

from pydantic import BaseModel


class PredictionResponse(BaseModel):
    success: bool = True
    isWaste: bool
    category: Optional[str] = None
    label: str
    confidence: float
    recommendation: str
    error: Optional[str] = None
