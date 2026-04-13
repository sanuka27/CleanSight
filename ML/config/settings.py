"""Centralized ML runtime settings.

Keeps path resolution and thresholds in one place so training/inference
contracts stay consistent across services and scripts.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


ML_DIR = Path(__file__).resolve().parent.parent


def _env_float(key: str, default: float) -> float:
    raw = os.getenv(key)
    if raw is None or raw.strip() == "":
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _env_int(key: str, default: int) -> int:
    raw = os.getenv(key)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _resolve_path(raw_path: str) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path
    return (ML_DIR / path).resolve()


@dataclass(frozen=True)
class MLSettings:
    binary_model_path: Path
    binary_class_names_path: Path
    category_model_path: Path
    category_class_names_path: Path
    binary_image_size: tuple[int, int]
    binary_confidence_threshold: float
    category_high_confidence_threshold: float
    category_moderate_confidence_threshold: float
    category_low_confidence_threshold: float
    max_image_bytes: int


def load_settings() -> MLSettings:
    binary_model_path = os.getenv("BINARY_MODEL_PATH") or os.getenv("MODEL_PATH") or "models/trash_classifier.keras"
    category_model_path = os.getenv("CATEGORY_MODEL_PATH") or "models/waste_category_classifier.pt"

    return MLSettings(
        binary_model_path=_resolve_path(binary_model_path),
        binary_class_names_path=_resolve_path(
            os.getenv("BINARY_CLASS_NAMES_PATH") or "models/class_names.json"
        ),
        category_model_path=_resolve_path(category_model_path),
        category_class_names_path=_resolve_path(
            os.getenv("CATEGORY_CLASS_NAMES_PATH") or "models/category_class_names.json"
        ),
        binary_image_size=(224, 224),
        binary_confidence_threshold=_env_float(
            "BINARY_CONFIDENCE_THRESHOLD",
            _env_float("CONFIDENCE_THRESHOLD", 0.70),
        ),
        category_high_confidence_threshold=_env_float("CATEGORY_HIGH_CONFIDENCE_THRESHOLD", 0.80),
        category_moderate_confidence_threshold=_env_float("CATEGORY_MODERATE_CONFIDENCE_THRESHOLD", 0.50),
        category_low_confidence_threshold=_env_float("CATEGORY_LOW_CONFIDENCE_THRESHOLD", 0.30),
        max_image_bytes=_env_int("MAX_IMAGE_BYTES", 5 * 1024 * 1024),
    )


settings = load_settings()
