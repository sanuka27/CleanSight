from __future__ import annotations

import os
import sys


try:
    from ML.inference.binary_runtime import load_binary_model, predict_binary
except ImportError:
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    if PROJECT_ROOT not in sys.path:
        sys.path.insert(0, PROJECT_ROOT)
    from ML.inference.binary_runtime import load_binary_model, predict_binary


def load_model() -> None:
    """Load and cache the Phase 1 model at startup."""
    if not load_binary_model():
        # Keep startup alive; endpoint returns structured error until model is available.
        print("Warning: Binary model could not be loaded at startup")


def predict_image_contract(image_bytes: bytes) -> dict:
    """Return unified binary inference payload."""
    return predict_binary(image_bytes)


def predict_image(image_bytes: bytes) -> tuple[str, float]:
    """Backward-compatible tuple response used by legacy callers."""
    result = predict_binary(image_bytes)
    if not result.get("success"):
        raise RuntimeError(result.get("error", "Binary prediction failed"))

    return result["label"], float(result["confidence"])
