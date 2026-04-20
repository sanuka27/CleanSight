"""Prediction postprocessing and contract formatting helpers."""

from __future__ import annotations

from typing import Iterable


BINARY_TRASH_LABEL = "trash"
BINARY_NON_TRASH_LABEL = "non-trash"


def clamp_confidence(value: float) -> float:
    """Clamp confidence into [0, 1] to avoid invalid outputs."""
    if value is None:
        return 0.0
    return max(0.0, min(1.0, float(value)))


def normalize_binary_label(label: str | None) -> str:
    """Normalize binary labels to backend-safe values."""
    if not label:
        return BINARY_NON_TRASH_LABEL

    normalized = str(label).strip().lower().replace("_", "-")

    if normalized in {"trash", "waste"}:
        return BINARY_TRASH_LABEL
    if normalized in {"non-trash", "nontrash", "clean", "not-trash"}:
        return BINARY_NON_TRASH_LABEL

    return normalized


def map_binary_probability(
    probability: float,
    positive_label: str = BINARY_TRASH_LABEL,
    negative_label: str = BINARY_NON_TRASH_LABEL,
) -> dict:
    """Map sigmoid output probability to normalized binary prediction fields."""
    positive_label = normalize_binary_label(positive_label)
    negative_label = normalize_binary_label(negative_label)

    probability = clamp_confidence(probability)
    predicted_positive = probability >= 0.5

    label = positive_label if predicted_positive else negative_label
    confidence = probability if predicted_positive else (1.0 - probability)
    confidence = clamp_confidence(confidence)

    return {
        "label": label,
        "isWaste": label == BINARY_TRASH_LABEL,
        "confidence": confidence,
    }


def get_category_confidence_level(
    confidence: float,
    entropy: float,
    high_threshold: float,
    moderate_threshold: float,
    low_threshold: float,
) -> str:
    """Interpret model certainty for Phase 2 predictions."""
    confidence = clamp_confidence(confidence)
    entropy = max(0.0, min(1.0, float(entropy)))

    if confidence >= high_threshold and entropy < 0.30:
        return "HIGH"
    if confidence >= moderate_threshold:
        return "MODERATE"
    if confidence >= low_threshold:
        return "LOW"
    return "VERY LOW"


def get_category_review_status(confidence_level: str) -> str:
    """Map confidence level to backend review workflow status."""
    if confidence_level == "HIGH":
        return "auto_accepted"
    if confidence_level == "MODERATE":
        return "flagged"
    return "manual_review"


def format_category_predictions(class_names: list[str], probabilities: Iterable[float]) -> list[dict]:
    """Return predictions sorted by descending confidence."""
    scored = []
    for index, score in enumerate(probabilities):
        class_name = class_names[index] if index < len(class_names) else f"class_{index}"
        scored.append({
            "class_name": str(class_name),
            "confidence": clamp_confidence(float(score)),
        })

    scored.sort(key=lambda item: item["confidence"], reverse=True)
    return scored


def build_binary_response(is_waste: bool, confidence: float, threshold: float) -> dict:
    """Build a consistent Phase 1 payload."""
    confidence = clamp_confidence(confidence)
    label = BINARY_TRASH_LABEL if is_waste else BINARY_NON_TRASH_LABEL

    return {
        "success": True,
        "isWaste": bool(is_waste),
        "category": None,
        "label": label,
        "confidence": confidence,
        "recommendation": "automated_approval" if confidence >= threshold else "manual_review",
    }


def build_category_response(
    predicted_class: str,
    confidence: float,
    entropy: float,
    confidence_level: str,
    review_status: str,
    all_predictions: list[dict],
) -> dict:
    """Build a consistent Phase 2 payload."""
    return {
        "success": True,
        "isWaste": True,
        "category": predicted_class,
        "predicted_class": predicted_class,
        "confidence": clamp_confidence(confidence),
        "entropy": max(0.0, min(1.0, float(entropy))),
        "confidence_level": confidence_level,
        "review_status": review_status,
        "all_predictions": all_predictions,
    }
