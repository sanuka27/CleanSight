"""Binary inference runtime with lazy model caching."""

from __future__ import annotations

import json
import threading

from ML.config.settings import settings
from ML.postprocessing.predictions import (
    BINARY_NON_TRASH_LABEL,
    BINARY_TRASH_LABEL,
    build_binary_response,
    map_binary_probability,
    normalize_binary_label,
)
from ML.preprocessing.image import ImagePreprocessError, preprocess_binary_image


_model = None
_positive_label = BINARY_TRASH_LABEL
_negative_label = BINARY_NON_TRASH_LABEL
_model_lock = threading.Lock()
_runtime_error = None


def _load_binary_class_names() -> tuple[str, str]:
    class_names = json.loads(settings.binary_class_names_path.read_text(encoding="utf-8"))
    if not isinstance(class_names, list) or len(class_names) != 2:
        raise ValueError("Binary class names file must contain exactly two labels")

    negative_label = normalize_binary_label(class_names[0])
    positive_label = normalize_binary_label(class_names[1])

    if negative_label == positive_label:
        raise ValueError("Binary class names must be distinct")

    return negative_label, positive_label


def load_binary_model(force_reload: bool = False) -> bool:
    """Load the binary model once and keep it cached in memory."""
    global _model, _positive_label, _negative_label, _runtime_error

    if _model is not None and not force_reload:
        return True

    with _model_lock:
        if _model is not None and not force_reload:
            return True

        if not settings.binary_model_path.exists():
            _model = None
            _runtime_error = f"Binary model not found at {settings.binary_model_path}"
            return False

        if not settings.binary_class_names_path.exists():
            _model = None
            _runtime_error = (
                "Binary class names file not found at "
                f"{settings.binary_class_names_path}. "
                "Refusing to run inference without explicit label mapping."
            )
            return False

        try:
            import tensorflow as tf

            _model = tf.keras.models.load_model(settings.binary_model_path)
            _negative_label, _positive_label = _load_binary_class_names()
            _runtime_error = None
            return True
        except Exception as exc:  # pylint: disable=broad-except
            _model = None
            _runtime_error = f"Failed to load binary model: {exc}"
            return False


def predict_binary(image_bytes: bytes) -> dict:
    """Predict waste/non-waste from raw image bytes."""
    if _model is None and not load_binary_model():
        return {
            "success": False,
            "error": _runtime_error or "Binary model is not available",
            "errorType": "model_unavailable",
            "isWaste": False,
            "category": None,
            "label": "error",
            "confidence": 0.0,
            "recommendation": "manual_review",
        }

    try:
        image_tensor = preprocess_binary_image(
            image_bytes=image_bytes,
            image_size=settings.binary_image_size,
        )

        probabilities = _model.predict(image_tensor, verbose=0)
        raw_probability = float(probabilities[0][0])

        binary_prediction = map_binary_probability(
            probability=raw_probability,
            positive_label=_positive_label,
            negative_label=_negative_label,
        )

        return build_binary_response(
            is_waste=binary_prediction["isWaste"],
            confidence=binary_prediction["confidence"],
            threshold=settings.binary_confidence_threshold,
        )
    except ImagePreprocessError as exc:
        return {
            "success": False,
            "error": str(exc),
            "errorType": "invalid_image",
            "isWaste": False,
            "category": None,
            "label": "error",
            "confidence": 0.0,
            "recommendation": "manual_review",
        }
    except Exception as exc:  # pylint: disable=broad-except
        return {
            "success": False,
            "error": f"Binary inference failed: {exc}",
            "errorType": "inference_error",
            "isWaste": False,
            "category": None,
            "label": "error",
            "confidence": 0.0,
            "recommendation": "manual_review",
        }
