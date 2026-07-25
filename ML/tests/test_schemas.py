"""
Unit tests for ML/service/schemas.py

Tests Pydantic model validation for PredictionResponse — ensures the schema
enforces required fields and provides correct defaults.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from ML.service.schemas import PredictionResponse


class TestPredictionResponseSchema:
    """Tests for PredictionResponse Pydantic model."""

    def test_valid_waste_prediction(self):
        """All required fields present — should deserialise without error."""
        data = {
            "success": True,
            "isWaste": True,
            "label": "waste",
            "confidence": 0.92,
            "recommendation": "Please report this waste for collection.",
        }
        resp = PredictionResponse(**data)
        assert resp.success is True
        assert resp.isWaste is True
        assert resp.label == "waste"
        assert resp.confidence == pytest.approx(0.92)
        assert resp.recommendation == "Please report this waste for collection."

    def test_valid_non_waste_prediction(self):
        data = {
            "isWaste": False,
            "label": "non_waste",
            "confidence": 0.85,
            "recommendation": "This does not appear to be waste.",
        }
        resp = PredictionResponse(**data)
        assert resp.isWaste is False
        assert resp.label == "non_waste"

    def test_success_defaults_to_true(self):
        """success field has a default of True."""
        data = {
            "isWaste": True,
            "label": "waste",
            "confidence": 0.9,
            "recommendation": "Report it.",
        }
        resp = PredictionResponse(**data)
        assert resp.success is True

    def test_category_defaults_to_none(self):
        """category is Optional and defaults to None."""
        data = {
            "isWaste": True,
            "label": "waste",
            "confidence": 0.9,
            "recommendation": "Report it.",
        }
        resp = PredictionResponse(**data)
        assert resp.category is None

    def test_category_accepts_string(self):
        data = {
            "isWaste": True,
            "category": "general",
            "label": "waste",
            "confidence": 0.9,
            "recommendation": "Report it.",
        }
        resp = PredictionResponse(**data)
        assert resp.category == "general"

    def test_error_defaults_to_none(self):
        """error field is Optional and defaults to None."""
        data = {
            "isWaste": True,
            "label": "waste",
            "confidence": 0.9,
            "recommendation": "Report it.",
        }
        resp = PredictionResponse(**data)
        assert resp.error is None

    def test_error_field_accepts_string(self):
        data = {
            "success": False,
            "isWaste": False,
            "label": "error",
            "confidence": 0.0,
            "recommendation": "Model unavailable.",
            "error": "Binary model is not loaded",
        }
        resp = PredictionResponse(**data)
        assert resp.error == "Binary model is not loaded"
        assert resp.success is False

    def test_missing_required_field_is_waste_raises(self):
        """isWaste is required — omitting it should raise a ValidationError."""
        data = {
            "label": "waste",
            "confidence": 0.9,
            "recommendation": "Report it.",
        }
        with pytest.raises(ValidationError) as exc_info:
            PredictionResponse(**data)
        errors = exc_info.value.errors()
        fields = [e["loc"][0] for e in errors]
        assert "isWaste" in fields

    def test_missing_required_field_label_raises(self):
        data = {
            "isWaste": True,
            "confidence": 0.9,
            "recommendation": "Report it.",
        }
        with pytest.raises(ValidationError) as exc_info:
            PredictionResponse(**data)
        errors = exc_info.value.errors()
        fields = [e["loc"][0] for e in errors]
        assert "label" in fields

    def test_missing_required_field_confidence_raises(self):
        data = {
            "isWaste": True,
            "label": "waste",
            "recommendation": "Report it.",
        }
        with pytest.raises(ValidationError) as exc_info:
            PredictionResponse(**data)
        errors = exc_info.value.errors()
        fields = [e["loc"][0] for e in errors]
        assert "confidence" in fields

    def test_missing_required_field_recommendation_raises(self):
        data = {
            "isWaste": True,
            "label": "waste",
            "confidence": 0.9,
        }
        with pytest.raises(ValidationError) as exc_info:
            PredictionResponse(**data)
        errors = exc_info.value.errors()
        fields = [e["loc"][0] for e in errors]
        assert "recommendation" in fields

    def test_confidence_must_be_numeric(self):
        """confidence must be a float — a non-numeric value should fail."""
        data = {
            "isWaste": True,
            "label": "waste",
            "confidence": "high",
            "recommendation": "Report it.",
        }
        with pytest.raises(ValidationError):
            PredictionResponse(**data)

    def test_confidence_at_boundary_values(self):
        """Confidence values of 0.0 and 1.0 are valid."""
        for confidence in (0.0, 1.0):
            resp = PredictionResponse(
                isWaste=True if confidence > 0.5 else False,
                label="waste",
                confidence=confidence,
                recommendation="Report it.",
            )
            assert resp.confidence == pytest.approx(confidence)

    def test_json_serialisation_round_trip(self):
        """PredictionResponse can be serialised and deserialised via JSON."""
        original = PredictionResponse(
            isWaste=True,
            category="general",
            label="waste",
            confidence=0.95,
            recommendation="Report this waste for collection.",
        )
        json_str = original.json()
        recovered = PredictionResponse.parse_raw(json_str)
        assert recovered.label == original.label
        assert recovered.confidence == pytest.approx(original.confidence)
        assert recovered.category == original.category
