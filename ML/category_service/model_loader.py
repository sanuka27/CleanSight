"""
CleanSight ML Phase 2 - Category Model Loader (PyTorch)

Loads the trained Phase 2 waste category classification model.
"""

import os
import json
import math
import torch
import torch.nn.functional as F
from PIL import Image
import io

# Import shared utilities from parent ML package
try:
    from ..utils.model_utils import get_device, create_model, get_val_transform
except ImportError:
    # Fallback for cases where package structure isn't properly set up
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
    from utils.model_utils import get_device, create_model, get_val_transform

# Model paths
ML_DIR = os.path.join(os.path.dirname(__file__), '..')
MODEL_PATH = os.getenv(
    "CATEGORY_MODEL_PATH",
    os.path.join(ML_DIR, "models", "waste_category_classifier.pt")
)
CLASS_NAMES_PATH = os.getenv(
    "CATEGORY_CLASS_NAMES_PATH",
    os.path.join(ML_DIR, "models", "category_class_names.json")
)

# Confidence thresholds
HIGH_CONFIDENCE_THRESHOLD = 0.80
MODERATE_CONFIDENCE_THRESHOLD = 0.50
LOW_CONFIDENCE_THRESHOLD = 0.30

# Global model state
model = None
class_names = None
device = None
transform = None


def load_model():
    """Load the Phase 2 category classification model."""
    global model, class_names, device, transform

    device = get_device()
    transform = get_val_transform()

    # Load class names
    if os.path.exists(CLASS_NAMES_PATH):
        with open(CLASS_NAMES_PATH, 'r', encoding='utf-8') as f:
            class_names = json.load(f)
        print(f"Loaded class names: {class_names}")
    else:
        print(f"Warning: Class names file not found at {CLASS_NAMES_PATH}")
        class_names = ['glass', 'mixed', 'paper', 'plastic']

    # Load model
    if os.path.exists(MODEL_PATH):
        try:
            model = create_model(len(class_names), pretrained=False)
            model.load_state_dict(
                torch.load(MODEL_PATH, map_location=device, weights_only=True)
            )
            model = model.to(device)
            model.eval()
            print(f"Category model loaded successfully from {MODEL_PATH}")
            print(f"Using device: {device}")
        except Exception as e:
            print(f"Error loading category model: {e}")
            model = None
    else:
        print(f"Warning: Category model not found at {MODEL_PATH}")
        model = None


def calculate_entropy(probabilities):
    """Calculate normalized entropy of probability distribution."""
    eps = 1e-10
    probs = [p + eps for p in probabilities]
    entropy = -sum(p * math.log(p) for p in probs)
    max_entropy = math.log(len(probabilities))
    return entropy / max_entropy if max_entropy > 0 else 0


def interpret_confidence(confidence, entropy):
    """Interpret confidence level based on confidence and entropy."""
    if confidence >= HIGH_CONFIDENCE_THRESHOLD and entropy < 0.3:
        return "HIGH"
    elif confidence >= MODERATE_CONFIDENCE_THRESHOLD:
        return "MODERATE"
    elif confidence >= LOW_CONFIDENCE_THRESHOLD:
        return "LOW"
    else:
        return "VERY LOW"


def predict_category(image_bytes: bytes) -> dict:
    """
    Predict waste category from image bytes.

    Returns dict with:
    - success: bool
    - predicted_class: str
    - confidence: float
    - entropy: float
    - confidence_level: str
    - all_predictions: list of {class_name, confidence}
    - error: str (if failed)
    """
    if model is None:
        return {
            "success": False,
            "error": "Category model is not loaded"
        }

    try:
        # Load and preprocess image
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_tensor = transform(img).unsqueeze(0).to(device)

        # Run inference
        with torch.no_grad():
            outputs = model(img_tensor)
            probabilities = F.softmax(outputs, dim=1)

        # Convert to numpy
        probs = probabilities[0].cpu().numpy()

        # Get sorted predictions
        sorted_indices = probs.argsort()[::-1]

        # Build predictions list
        all_predictions = []
        for idx in sorted_indices:
            all_predictions.append({
                "class_name": class_names[idx],
                "confidence": float(probs[idx])
            })

        # Top prediction
        top_idx = sorted_indices[0]
        top_class = class_names[top_idx]
        top_confidence = float(probs[top_idx])

        # Calculate entropy and confidence level
        entropy = calculate_entropy(probs.tolist())
        confidence_level = interpret_confidence(top_confidence, entropy)

        return {
            "success": True,
            "predicted_class": top_class,
            "confidence": top_confidence,
            "entropy": entropy,
            "confidence_level": confidence_level,
            "all_predictions": all_predictions
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Error during category prediction: {str(e)}"
        }
