"""Inference runtime package."""

from .binary_runtime import load_binary_model, predict_binary
from .category_runtime import load_category_model, predict_category

__all__ = [
    "load_binary_model",
    "predict_binary",
    "load_category_model",
    "predict_category",
]
