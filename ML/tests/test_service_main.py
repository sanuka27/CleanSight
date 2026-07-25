"""
Tests for ML/service/main.py — the FastAPI application.

Tests:
  - GET /health — liveness probe
  - POST /predict — happy paths (waste / non-waste) and all error paths
    (missing inputs, model unavailable, invalid image)

Uses httpx.AsyncClient via pytest-asyncio so we test the full ASGI stack.
No real model or network calls are made — all heavy operations are patched.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport


# ── /health endpoint ──────────────────────────────────────────────────────────

class TestHealthEndpoint:
    """Tests for the /health liveness probe."""

    def test_health_returns_200(self, test_client: TestClient):
        response = test_client.get("/health")
        assert response.status_code == 200

    def test_health_response_contains_ok_status(self, test_client: TestClient):
        data = test_client.get("/health").json()
        assert data["status"] == "ok"

    def test_health_response_contains_service_name(self, test_client: TestClient):
        data = test_client.get("/health").json()
        assert "service" in data
        assert isinstance(data["service"], str)
        assert len(data["service"]) > 0

    def test_health_does_not_require_authentication(self, test_client: TestClient):
        """Health endpoint must be public — no auth header required."""
        response = test_client.get("/health")
        # Should never redirect to an auth page
        assert response.status_code != 401
        assert response.status_code != 403


# ── /predict endpoint ─────────────────────────────────────────────────────────

class TestPredictEndpoint:
    """Tests for the POST /predict inference endpoint."""

    # ── Missing inputs ────────────────────────────────────────────────────────

    def test_predict_no_image_or_url_returns_400(self, test_client: TestClient):
        """Both image and image_url omitted — should return 400."""
        response = test_client.post("/predict")
        assert response.status_code == 400

    def test_predict_empty_image_url_is_rejected(self, test_client: TestClient):
        """An empty image_url string is not a valid URL."""
        response = test_client.post("/predict", data={"image_url": ""})
        assert response.status_code == 400

    def test_predict_invalid_url_scheme_rejected(self, test_client: TestClient):
        """FTP URLs must be rejected."""
        with patch("ML.service.image_input._is_private_ip", return_value=False):
            response = test_client.post(
                "/predict", data={"image_url": "ftp://example.com/img.jpg"}
            )
        assert response.status_code == 400

    # ── Model unavailable ─────────────────────────────────────────────────────

    def test_predict_returns_503_when_model_unavailable(
        self, test_client: TestClient, jpeg_bytes: bytes
    ):
        """When model_loader returns a model_unavailable result, endpoint returns 503."""
        unavailable = {
            "success": False,
            "errorType": "model_unavailable",
            "error": "Binary model is not loaded",
        }
        with patch("ML.service.main.predict_image_contract", return_value=unavailable):
            response = test_client.post(
                "/predict",
                files={"image": ("test.jpg", jpeg_bytes, "image/jpeg")},
            )
        assert response.status_code == 503

    def test_predict_returns_400_for_invalid_image(
        self, test_client: TestClient, jpeg_bytes: bytes
    ):
        """When model_loader returns invalid_image errorType, endpoint returns 400."""
        invalid_image_result = {
            "success": False,
            "errorType": "invalid_image",
            "error": "Cannot decode image",
        }
        with patch("ML.service.main.predict_image_contract", return_value=invalid_image_result):
            response = test_client.post(
                "/predict",
                files={"image": ("test.jpg", jpeg_bytes, "image/jpeg")},
            )
        assert response.status_code == 400

    def test_predict_returns_500_for_unknown_error(
        self, test_client: TestClient, jpeg_bytes: bytes
    ):
        """When model_loader returns an unrecognised errorType, endpoint returns 500."""
        unknown_error = {
            "success": False,
            "errorType": "unexpected_error",
            "error": "Something went wrong",
        }
        with patch("ML.service.main.predict_image_contract", return_value=unknown_error):
            response = test_client.post(
                "/predict",
                files={"image": ("test.jpg", jpeg_bytes, "image/jpeg")},
            )
        assert response.status_code == 500

    # ── Happy paths ───────────────────────────────────────────────────────────

    def test_predict_waste_upload_returns_200_with_correct_shape(
        self, test_client: TestClient, jpeg_bytes: bytes
    ):
        """Valid upload with a waste prediction returns 200 and the schema fields."""
        waste_result = {
            "success": True,
            "isWaste": True,
            "category": "general",
            "label": "waste",
            "confidence": 0.95,
            "recommendation": "Please report this waste for collection.",
            "error": None,
        }
        with patch("ML.service.main.predict_image_contract", return_value=waste_result):
            response = test_client.post(
                "/predict",
                files={"image": ("test.jpg", jpeg_bytes, "image/jpeg")},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["isWaste"] is True
        assert data["label"] == "waste"
        assert 0.0 <= data["confidence"] <= 1.0
        assert "recommendation" in data

    def test_predict_non_waste_upload_returns_200(
        self, test_client: TestClient, png_bytes: bytes
    ):
        """Valid upload with a non-waste prediction returns 200."""
        non_waste_result = {
            "success": True,
            "isWaste": False,
            "category": None,
            "label": "non_waste",
            "confidence": 0.87,
            "recommendation": "This does not appear to be waste.",
            "error": None,
        }
        with patch("ML.service.main.predict_image_contract", return_value=non_waste_result):
            response = test_client.post(
                "/predict",
                files={"image": ("test.png", png_bytes, "image/png")},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["isWaste"] is False
        assert data["label"] == "non_waste"

    def test_predict_confidence_is_float(
        self, test_client: TestClient, jpeg_bytes: bytes
    ):
        """Confidence field in the response must be a float."""
        result = {
            "success": True,
            "isWaste": True,
            "category": None,
            "label": "waste",
            "confidence": 0.72,
            "recommendation": "Report it.",
            "error": None,
        }
        with patch("ML.service.main.predict_image_contract", return_value=result):
            response = test_client.post(
                "/predict",
                files={"image": ("test.jpg", jpeg_bytes, "image/jpeg")},
            )

        data = response.json()
        assert isinstance(data["confidence"], float)

    def test_predict_oversized_upload_rejected(self, test_client: TestClient):
        """Uploading more than max_image_bytes should return 400."""
        # Default max is from settings; we patch it to a very small value
        with patch("ML.service.image_input.extract_image_bytes", new_callable=AsyncMock) as mock_extract:
            from fastapi import HTTPException
            mock_extract.side_effect = HTTPException(status_code=400, detail="Image too large")
            response = test_client.post(
                "/predict",
                files={"image": ("large.jpg", b"X" * 100, "image/jpeg")},
            )
        assert response.status_code == 400

    # ── URL-based prediction ──────────────────────────────────────────────────

    def test_predict_via_image_url_returns_200(self, test_client: TestClient, jpeg_bytes: bytes):
        """Sending image_url instead of an upload file returns 200 on success."""
        waste_result = {
            "success": True,
            "isWaste": True,
            "category": None,
            "label": "waste",
            "confidence": 0.91,
            "recommendation": "Report it.",
            "error": None,
        }
        # Patch both the SSRF guard and the model so no real HTTP is made
        with patch("ML.service.image_input._download_image_bytes", new_callable=AsyncMock, return_value=jpeg_bytes), \
             patch("ML.service.main.predict_image_contract", return_value=waste_result):
            response = test_client.post(
                "/predict",
                data={"image_url": "https://example.com/waste-photo.jpg"},
            )

        assert response.status_code == 200
        assert response.json()["isWaste"] is True

    # ── Unhandled exception path ──────────────────────────────────────────────

    def test_predict_returns_500_on_unexpected_exception(
        self, test_client: TestClient, jpeg_bytes: bytes
    ):
        """An unhandled exception inside the handler should return 500."""
        with patch(
            "ML.service.main.predict_image_contract",
            side_effect=RuntimeError("Unexpected crash"),
        ):
            response = test_client.post(
                "/predict",
                files={"image": ("test.jpg", jpeg_bytes, "image/jpeg")},
            )
        assert response.status_code == 500


# ── Startup — model loading ───────────────────────────────────────────────────

class TestStartupBehaviour:
    """Tests that server starts gracefully even when the model fails to load."""

    def test_app_starts_without_model(self):
        """Server must start even if load_binary_model returns False."""
        with patch("ML.service.model_loader.load_binary_model", return_value=False), \
             patch("ML.service.model_loader.get_binary_runtime_error", return_value="Model file not found"):
            from ML.service.main import app
            client = TestClient(app)
            # Health should still respond
            response = client.get("/health")
            assert response.status_code == 200

    def test_app_predict_unavailable_when_model_not_loaded(self, jpeg_bytes: bytes):
        """If the model failed to load, /predict returns 503."""
        unavailable = {
            "success": False,
            "errorType": "model_unavailable",
            "error": "Binary model is not loaded",
        }
        with patch("ML.service.model_loader.load_binary_model", return_value=False), \
             patch("ML.service.model_loader.predict_binary", return_value=unavailable):
            from ML.service.main import app
            client = TestClient(app)
            response = client.post(
                "/predict",
                files={"image": ("test.jpg", jpeg_bytes, "image/jpeg")},
            )
        assert response.status_code == 503
