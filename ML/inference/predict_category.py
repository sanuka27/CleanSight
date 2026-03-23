"""
CleanSight ML Phase 2 — Waste Category Prediction (Inference) (PyTorch)

Loads the trained Phase 2 model and predicts the waste category
(plastic, paper, glass, or mixed) for a single image.

Features:
- Predicted category with confidence score
- Top-k predictions (all class probabilities)
- Confidence interpretation (high/moderate/low)
- Entropy-based uncertainty estimation
- JSON output option for programmatic use

This implementation uses PyTorch for Python 3.14.3 compatibility on Windows.

Usage (from project root):
    python -m ML.inference.predict_category --image <path_to_image>

Options:
    --model   Path to model file (default: ML/models/waste_category_classifier.pt)
    --labels  Path to class names JSON (default: ML/models/category_class_names.json)
    --top-k   Number of top predictions to show (default: all classes)
    --json    Output result as JSON (for programmatic use)
"""

import os
import sys
import json
import argparse
import math

import torch
import torch.nn.functional as F
from PIL import Image

from ML.utils.model_utils import get_device, create_model, get_val_transform

# Paths (relative to project root)
ML_DIR = os.path.join(os.path.dirname(__file__), os.pardir)
ML_DIR = os.path.abspath(ML_DIR)

DEFAULT_MODEL_PATH = os.path.join(ML_DIR, "models", "waste_category_classifier.pt")
DEFAULT_CLASS_NAMES_PATH = os.path.join(ML_DIR, "models", "category_class_names.json")

# Confidence thresholds for interpretation
HIGH_CONFIDENCE_THRESHOLD = 0.80
MODERATE_CONFIDENCE_THRESHOLD = 0.50
LOW_CONFIDENCE_THRESHOLD = 0.30


def load_class_names(class_names_path):
    """Load class names saved during training."""
    if not os.path.exists(class_names_path):
        print(f"ERROR: Class names file not found: {class_names_path}")
        print("This file is created during training. Please train the model first:")
        print("  python -m ML.training.train_category_model")
        sys.exit(1)

    with open(class_names_path, "r", encoding="utf-8") as f:
        class_names = json.load(f)

    return class_names


def load_model(model_path, num_classes, device):
    """Load the trained model weights."""
    model = create_model(num_classes, pretrained=False)
    model.load_state_dict(torch.load(model_path, map_location=device, weights_only=True))
    model = model.to(device)
    model.eval()
    return model


def calculate_entropy(probabilities):
    """
    Calculate the entropy of a probability distribution.

    Higher entropy = more uncertainty (predictions spread across classes)
    Lower entropy = more certainty (one class dominates)

    Args:
        probabilities: numpy array of class probabilities

    Returns:
        entropy value (normalized to 0-1 range for num_classes)
    """
    # Avoid log(0) by adding small epsilon
    eps = 1e-10
    probs = probabilities + eps

    # Calculate entropy: -sum(p * log(p))
    entropy = -sum(p * math.log(p) for p in probs)

    # Normalize by maximum possible entropy (uniform distribution)
    max_entropy = math.log(len(probabilities))
    normalized_entropy = entropy / max_entropy if max_entropy > 0 else 0

    return normalized_entropy


def interpret_confidence(confidence, entropy, num_classes):
    """
    Interpret the confidence level and provide a human-readable interpretation.

    Args:
        confidence: Top prediction confidence (0-1)
        entropy: Normalized entropy of distribution (0-1)
        num_classes: Number of classes

    Returns:
        dict with level, interpretation, and recommendation
    """
    # Combine confidence and entropy for better interpretation
    # High confidence + low entropy = very certain
    # Low confidence + high entropy = uncertain

    if confidence >= HIGH_CONFIDENCE_THRESHOLD and entropy < 0.3:
        return {
            "level": "HIGH",
            "interpretation": "Model is confident in this prediction",
            "recommendation": "Prediction can be trusted",
            "color": "green",
        }
    elif confidence >= MODERATE_CONFIDENCE_THRESHOLD:
        return {
            "level": "MODERATE",
            "interpretation": "Model has reasonable confidence",
            "recommendation": "Review may be needed for critical decisions",
            "color": "yellow",
        }
    elif confidence >= LOW_CONFIDENCE_THRESHOLD:
        return {
            "level": "LOW",
            "interpretation": "Model is uncertain about this prediction",
            "recommendation": "Manual review recommended",
            "color": "orange",
        }
    else:
        return {
            "level": "VERY LOW",
            "interpretation": "Model cannot confidently classify this image",
            "recommendation": "Manual classification required",
            "color": "red",
        }


def predict_category(model, image_path, class_names, device):
    """
    Predict the waste category for a single image.

    Args:
        model: Trained PyTorch model
        image_path: Path to the image file
        class_names: List of class names
        device: torch device

    Returns:
        dict with prediction results
    """
    transform = get_val_transform()

    # Load and preprocess the image
    try:
        img = Image.open(image_path).convert("RGB")
        original_size = img.size
        img_tensor = transform(img).unsqueeze(0).to(device)
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to load or preprocess image: {e}",
        }

    # Run inference
    with torch.no_grad():
        outputs = model(img_tensor)
        probabilities = F.softmax(outputs, dim=1)

    # Convert to numpy for easier handling
    probs = probabilities[0].cpu().numpy()

    # Get sorted predictions
    sorted_indices = probs.argsort()[::-1]  # Descending order

    # Build predictions list
    predictions = []
    for idx in sorted_indices:
        predictions.append({
            "class": class_names[idx],
            "confidence": float(probs[idx]),
            "rank": len(predictions) + 1,
        })

    # Top prediction
    top_idx = sorted_indices[0]
    top_class = class_names[top_idx]
    top_confidence = float(probs[top_idx])

    # Calculate uncertainty metrics
    entropy = calculate_entropy(probs)

    # Get confidence interpretation
    interpretation = interpret_confidence(top_confidence, entropy, len(class_names))

    return {
        "success": True,
        "image_path": image_path,
        "image_size": original_size,
        "predicted_class": top_class,
        "confidence": top_confidence,
        "entropy": entropy,
        "interpretation": interpretation,
        "all_predictions": predictions,
    }


def print_result(result, top_k=None):
    """Print prediction result in a human-readable format."""
    if not result["success"]:
        print(f"\nERROR: {result['error']}")
        return

    # Header
    print("\n" + "=" * 55)
    print("  CATEGORY PREDICTION RESULT")
    print("=" * 55)

    # Image info
    print(f"\n  Image: {result['image_path']}")
    print(f"  Size:  {result['image_size'][0]}x{result['image_size'][1]} px")

    # Main prediction
    print("\n" + "-" * 55)
    print(f"  Predicted Category:  {result['predicted_class'].upper()}")
    print(f"  Confidence:          {result['confidence']:.2%}")
    print(f"  Uncertainty:         {result['entropy']:.3f} (entropy)")
    print("-" * 55)

    # Confidence interpretation
    interp = result['interpretation']
    print(f"\n  Confidence Level: {interp['level']}")
    print(f"  {interp['interpretation']}")
    print(f"  {interp['recommendation']}")

    # All predictions (or top-k)
    print("\n" + "-" * 55)
    print("  All Class Scores:")
    print("-" * 55)

    predictions = result['all_predictions']
    # Only apply top-k when it is a positive integer; non-positive means "show all"
    if top_k is not None and top_k > 0 and top_k < len(predictions):
        predictions = predictions[:top_k]
        print(f"  (showing top {top_k})\n")
    else:
        print()

    # Find max class name length for alignment
    max_name_len = max(len(p['class']) for p in predictions)

    for pred in predictions:
        # Create visual bar
        bar_len = int(pred['confidence'] * 35)
        bar = "█" * bar_len

        # Highlight top prediction
        marker = " <--" if pred['rank'] == 1 else ""

        print(f"    {pred['class']:{max_name_len}s}  {pred['confidence']:6.2%}  {bar}{marker}")

    print("\n" + "=" * 55)

    # Status summary
    if interp['level'] in ['HIGH', 'MODERATE']:
        print(f"  Status: {result['predicted_class'].upper()} ({interp['level']} confidence)")
    else:
        print(f"  Status: {interp['level']} confidence - manual review suggested")

    print("=" * 55 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="CleanSight Phase 2 - Predict waste category from an image (PyTorch)"
    )
    parser.add_argument(
        "--image", type=str, required=True,
        help="Path to the image file to classify"
    )
    parser.add_argument(
        "--model", type=str, default=DEFAULT_MODEL_PATH,
        help="Path to the trained model file (.pt)"
    )
    parser.add_argument(
        "--labels", type=str, default=DEFAULT_CLASS_NAMES_PATH,
        help="Path to the class names JSON file"
    )
    parser.add_argument(
        "--top-k", type=int, default=None,
        help="Number of top predictions to show (default: all)"
    )
    parser.add_argument(
        "--json", action="store_true",
        help="Output result as JSON (for programmatic use)"
    )
    args = parser.parse_args()

    # Validate inputs
    if not os.path.exists(args.image):
        if args.json:
            print(json.dumps({"success": False, "error": f"Image file not found: {args.image}"}))
        else:
            print(f"ERROR: Image file not found: {args.image}")
        sys.exit(1)

    if not os.path.exists(args.model):
        if args.json:
            print(json.dumps({"success": False, "error": f"Model file not found: {args.model}"}))
        else:
            print(f"ERROR: Model file not found: {args.model}")
            print("Please train the model first:")
            print("  python -m ML.training.train_category_model")
        sys.exit(1)

    # Load class names from training
    class_names = load_class_names(args.labels)

    # Get device
    device = get_device()

    if not args.json:
        print(f"Loading model... (device: {device})")

    # Load model
    model = load_model(args.model, len(class_names), device)

    # Predict
    result = predict_category(model, args.image, class_names, device)

    # Output
    if args.json:
        # Clean up result for JSON output
        json_result = {
            "success": result["success"],
            "predicted_class": result.get("predicted_class"),
            "confidence": result.get("confidence"),
            "entropy": result.get("entropy"),
            "confidence_level": result.get("interpretation", {}).get("level"),
            "all_predictions": [
                {"class": p["class"], "confidence": p["confidence"]}
                for p in result.get("all_predictions", [])
            ],
            "error": result.get("error"),
        }
        print(json.dumps(json_result, indent=2))
    else:
        print_result(result, top_k=args.top_k)


if __name__ == "__main__":
    main()
