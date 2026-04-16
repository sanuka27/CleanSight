"""Category inference runtime with lazy model caching."""

from __future__ import annotations

import json
import math
import threading

import torch
import torch.nn.functional as F

from ML.config.settings import settings
from ML.postprocessing.predictions import (
    build_category_response,
    format_category_predictions,
    get_category_confidence_level,
    get_category_review_status,
)
from ML.preprocessing.image import ImagePreprocessError, preprocess_category_image
from ML.utils.model_utils import create_model, get_device, get_val_transform


DEFAULT_CLASS_NAMES = ["glass", "mixed", "paper", "plastic"]

_model = None
_class_names = DEFAULT_CLASS_NAMES
_device = None
_transform = None
_runtime_error = None
_model_lock = threading.Lock()


def _safe_load_state_dict(model_path, device):
    try:
        return torch.load(model_path, map_location=device, weights_only=True)
    except TypeError:
        return torch.load(model_path, map_location=device)


def _load_category_class_names() -> list[str]:
    payload = json.loads(settings.category_class_names_path.read_text(encoding="utf-8"))
    if not isinstance(payload, list) or not payload:
        raise ValueError("Category class names file must contain a non-empty array")

    normalized = [str(label).strip().lower() for label in payload]
    if len(normalized) != len(set(normalized)):
        raise ValueError("Category class names must be unique")

    return normalized


def _calculate_entropy(probabilities: list[float]) -> float:
    eps = 1e-10
    probs = [max(eps, p) for p in probabilities]
    entropy = -sum(p * math.log(p) for p in probs)
    max_entropy = math.log(len(probs)) if probs else 1.0
    return entropy / max_entropy if max_entropy > 0 else 0.0


def load_category_model(force_reload: bool = False) -> bool:
    """Load the category model once and cache it for future requests."""
    global _model, _class_names, _device, _transform, _runtime_error

    if _model is not None and not force_reload:
        return True

    with _model_lock:
        if _model is not None and not force_reload:
            return True

        if not settings.category_model_path.exists():
            _model = None
            _runtime_error = f"Category model not found at {settings.category_model_path}"
            return False

        if not settings.category_class_names_path.exists():
            _model = None
            _runtime_error = (
                "Category class names file not found at "
                f"{settings.category_class_names_path}. "
                "Refusing to run inference with fallback labels to avoid incorrect mappings."
            )
            return False

        try:
            _class_names = _load_category_class_names()
            _device = get_device()
            _transform = get_val_transform()

            model = create_model(num_classes=len(_class_names), pretrained=False)
            state_dict = _safe_load_state_dict(settings.category_model_path, _device)
            model.load_state_dict(state_dict)
            model = model.to(_device)
            model.eval()

            _model = model
            _runtime_error = None
            return True
        except Exception as exc:  # pylint: disable=broad-except
            _model = None
            _runtime_error = f"Failed to load category model: {exc}"
            return False


def predict_category(image_bytes: bytes) -> dict:
    """Predict waste category from raw image bytes."""
    if _model is None and not load_category_model():
        return {
            "success": False,
            "error": _runtime_error or "Category model is not available",
            "errorType": "model_unavailable",
            "isWaste": True,
            "category": None,
            "predicted_class": None,
            "confidence": 0.0,
            "entropy": 1.0,
            "confidence_level": "VERY LOW",
            "review_status": "manual_review",
            "all_predictions": [],
        }

    try:
        tensor = preprocess_category_image(image_bytes, _transform).to(_device)

        with torch.no_grad():
            outputs = _model(tensor)
            probabilities = F.softmax(outputs, dim=1)[0].cpu().numpy().tolist()

        all_predictions = format_category_predictions(_class_names, probabilities)
        top_prediction = all_predictions[0]

        entropy = _calculate_entropy(probabilities)
        confidence_level = get_category_confidence_level(
            confidence=top_prediction["confidence"],
            entropy=entropy,
            high_threshold=settings.category_high_confidence_threshold,
            moderate_threshold=settings.category_moderate_confidence_threshold,
            low_threshold=settings.category_low_confidence_threshold,
        )
        review_status = get_category_review_status(confidence_level)

        return build_category_response(
            predicted_class=top_prediction["class_name"],
            confidence=top_prediction["confidence"],
            entropy=entropy,
            confidence_level=confidence_level,
            review_status=review_status,
            all_predictions=all_predictions,
        )
    except ImagePreprocessError as exc:
        return {
            "success": False,
            "error": str(exc),
            "errorType": "invalid_image",
            "isWaste": True,
            "category": None,
            "predicted_class": None,
            "confidence": 0.0,
            "entropy": 1.0,
            "confidence_level": "VERY LOW",
            "review_status": "manual_review",
            "all_predictions": [],
        }
    except Exception as exc:  # pylint: disable=broad-except
        return {
            "success": False,
            "error": f"Category inference failed: {exc}",
            "errorType": "inference_error",
            "isWaste": True,
            "category": None,
            "predicted_class": None,
            "confidence": 0.0,
            "entropy": 1.0,
            "confidence_level": "VERY LOW",
            "review_status": "manual_review",
            "all_predictions": [],
        }
