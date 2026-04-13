from __future__ import annotations

import os
import sys


try:
    from ML.inference.category_runtime import load_category_model, predict_category
except ImportError:
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    if PROJECT_ROOT not in sys.path:
        sys.path.insert(0, PROJECT_ROOT)
    from ML.inference.category_runtime import load_category_model, predict_category


def load_model() -> None:
    """Load and cache the category model at startup."""
    if not load_category_model():
        # Keep startup alive; endpoint returns structured error until model is available.
        print("Warning: Category model could not be loaded at startup")
