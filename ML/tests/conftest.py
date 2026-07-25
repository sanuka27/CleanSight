"""
Shared pytest fixtures for the CleanSight ML service test suite.

All fixtures are scoped conservatively to avoid test pollution.
No real model files or network connections are used.
"""

from __future__ import annotations

import io
import struct
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


# ── Minimal valid JPEG bytes ──────────────────────────────────────────────────
# A bare-minimum JPEG (SOI + EOI markers) — enough for Content-Type detection
# without needing PIL or a real image file on disk.

_MINIMAL_JPEG = bytes([
    0xFF, 0xD8, 0xFF, 0xE0,  # SOI + APP0 marker
    0x00, 0x10,              # APP0 length
    0x4A, 0x46, 0x49, 0x46, 0x00,  # JFIF identifier
    0x01, 0x01,              # version 1.1
    0x00,                    # aspect ratio units
    0x00, 0x01, 0x00, 0x01,  # pixel aspect ratio
    0x00, 0x00,              # thumbnail size
    0xFF, 0xD9,              # EOI
])

_MINIMAL_PNG = bytes([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
    # Minimal IHDR chunk
    0x00, 0x00, 0x00, 0x0D,  # chunk length
    0x49, 0x48, 0x44, 0x52,  # "IHDR"
    0x00, 0x00, 0x00, 0x01,  # width = 1
    0x00, 0x00, 0x00, 0x01,  # height = 1
    0x08, 0x02,              # bit depth, color type
    0x00, 0x00, 0x00,        # compression, filter, interlace
    0x90, 0x77, 0x53, 0xDE,  # CRC (pre-computed for 1x1 image)
    # IEND chunk
    0x00, 0x00, 0x00, 0x00,
    0x49, 0x45, 0x4E, 0x44,
    0xAE, 0x42, 0x60, 0x82,
])


@pytest.fixture
def jpeg_bytes() -> bytes:
    """Minimal valid JPEG bytes for upload tests."""
    return _MINIMAL_JPEG


@pytest.fixture
def png_bytes() -> bytes:
    """Minimal valid PNG bytes for upload tests."""
    return _MINIMAL_PNG


# ── Mocked model state ────────────────────────────────────────────────────────

MOCK_PREDICTION_RESULT = {
    "success": True,
    "isWaste": True,
    "category": "general",
    "label": "waste",
    "confidence": 0.95,
    "recommendation": "Please report this waste for collection.",
    "error": None,
}

MOCK_NON_WASTE_RESULT = {
    "success": True,
    "isWaste": False,
    "category": None,
    "label": "non_waste",
    "confidence": 0.87,
    "recommendation": "This does not appear to be waste.",
    "error": None,
}

MOCK_MODEL_UNAVAILABLE_RESULT = {
    "success": False,
    "errorType": "model_unavailable",
    "error": "Binary model is not loaded",
}


@pytest.fixture
def mock_predict_waste():
    """Patches predict_image_contract to return a waste prediction."""
    with patch(
        "ML.service.model_loader.predict_binary",
        return_value=MOCK_PREDICTION_RESULT,
    ) as mock:
        yield mock


@pytest.fixture
def mock_predict_non_waste():
    """Patches predict_image_contract to return a non-waste prediction."""
    with patch(
        "ML.service.model_loader.predict_binary",
        return_value=MOCK_NON_WASTE_RESULT,
    ) as mock:
        yield mock


@pytest.fixture
def mock_model_unavailable():
    """Patches predict_image_contract to simulate a model-not-loaded state."""
    with patch(
        "ML.service.model_loader.predict_binary",
        return_value=MOCK_MODEL_UNAVAILABLE_RESULT,
    ) as mock:
        yield mock


# ── TestClient factory ────────────────────────────────────────────────────────

@pytest.fixture
def test_client():
    """
    Returns a synchronous TestClient for the FastAPI app.

    The model load on startup is skipped to keep tests fast and
    independent of the model artifact being present on disk.
    """
    with patch("ML.service.model_loader.load_binary_model", return_value=True):
        from ML.service.main import app
        with TestClient(app) as client:
            yield client
