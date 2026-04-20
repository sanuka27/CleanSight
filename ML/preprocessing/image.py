"""Centralized image preprocessing for binary and category inference."""

from __future__ import annotations

import io
from pathlib import Path

import numpy as np
from PIL import Image, UnidentifiedImageError


class ImagePreprocessError(ValueError):
    """Raised when raw input cannot be decoded into a valid image."""


def load_rgb_image(image_bytes: bytes) -> Image.Image:
    """Decode bytes into an RGB image with strict validation."""
    if not image_bytes:
        raise ImagePreprocessError("Image payload is empty")

    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            return img.convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise ImagePreprocessError("Input is not a valid image") from exc


def preprocess_binary_image(image_bytes: bytes, image_size: tuple[int, int]) -> np.ndarray:
    """Preprocess image bytes for MobileNetV2 binary inference.

    The Phase 1 Keras model already includes MobileNetV2 preprocess_input in
    its graph, so inference must pass raw RGB pixel tensors (0-255) here.
    """
    img = load_rgb_image(image_bytes).resize(image_size)

    # Import TensorFlow lazily so importing utility modules stays lightweight.
    import tensorflow as tf

    img_array = tf.keras.preprocessing.image.img_to_array(img)
    return np.expand_dims(img_array, axis=0)


def preprocess_category_image(image_bytes: bytes, transform):
    """Preprocess image bytes for PyTorch category inference."""
    img = load_rgb_image(image_bytes)
    return transform(img).unsqueeze(0)


def read_image_file(image_path: str) -> bytes:
    """Read image bytes from disk with a consistent error surface."""
    path = Path(image_path)
    if not path.exists() or not path.is_file():
        raise ImagePreprocessError(f"Image file not found: {image_path}")

    data = path.read_bytes()
    if not data:
        raise ImagePreprocessError(f"Image file is empty: {image_path}")

    return data
