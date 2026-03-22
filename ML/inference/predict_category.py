"""
CleanSight ML Phase 2 — Waste Category Prediction (Inference) (PyTorch)

Loads the trained Phase 2 model and predicts the waste category
(plastic, paper, glass, or mixed) for a single image.

This implementation uses PyTorch for Python 3.14.3 compatibility on Windows.

Usage (from project root):
    python -m ML.inference.predict_category --image <path_to_image>

Options:
    --model   Path to model file (default: ML/models/waste_category_classifier.pt)
    --labels  Path to class names JSON (default: ML/models/category_class_names.json)
"""

import os
import sys
import json
import argparse

import torch
import torch.nn.functional as F
from PIL import Image

from ML.utils.model_utils import get_device, create_model, get_val_transform

# Paths (relative to project root)
ML_DIR = os.path.join(os.path.dirname(__file__), os.pardir)
ML_DIR = os.path.abspath(ML_DIR)

DEFAULT_MODEL_PATH = os.path.join(ML_DIR, "models", "waste_category_classifier.pt")
DEFAULT_CLASS_NAMES_PATH = os.path.join(ML_DIR, "models", "category_class_names.json")


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


def predict_category(model, image_path, class_names, device):
    """Predict the waste category for a single image."""
    transform = get_val_transform()

    # Load and preprocess the image
    try:
        img = Image.open(image_path).convert("RGB")
        img_tensor = transform(img).unsqueeze(0).to(device)
    except Exception as e:
        print(f"ERROR: Failed to load or preprocess image: {image_path}")
        print(f"Reason: {e}")
        print("Please ensure the file is a valid/decodable image.")
        sys.exit(1)

    # Run inference
    with torch.no_grad():
        outputs = model(img_tensor)
        probabilities = F.softmax(outputs, dim=1)
        confidence, predicted_idx = torch.max(probabilities, 1)

    predicted_label = class_names[predicted_idx.item()]
    confidence_value = confidence.item()
    all_scores = probabilities[0].cpu().numpy()

    return predicted_label, confidence_value, all_scores


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
    args = parser.parse_args()

    # Validate inputs
    if not os.path.exists(args.image):
        print(f"ERROR: Image file not found: {args.image}")
        sys.exit(1)

    if not os.path.exists(args.model):
        print(f"ERROR: Model file not found: {args.model}")
        print("Please train the model first:")
        print("  python -m ML.training.train_category_model")
        sys.exit(1)

    # Load class names from training
    class_names = load_class_names(args.labels)

    # Get device
    device = get_device()

    # Load model
    print(f"Loading model... (device: {device})")
    model = load_model(args.model, len(class_names), device)

    # Predict
    predicted_label, confidence, all_scores = predict_category(
        model, args.image, class_names, device
    )

    # Display results
    print("\n" + "=" * 50)
    print("  CATEGORY PREDICTION RESULT")
    print("=" * 50)
    print(f"  Image:      {args.image}")
    print(f"  Category:   {predicted_label}")
    print(f"  Confidence: {confidence:.2%}")
    print("-" * 50)
    print("  All scores:")
    for name, score in zip(class_names, all_scores):
        bar = "█" * int(score * 30)
        print(f"    {name:10s} {score:.4f}  {bar}")
    print("=" * 50)

    # Status message
    if confidence >= 0.8:
        print(f"  Status: High confidence - {predicted_label}")
    elif confidence >= 0.5:
        print(f"  Status: Moderate confidence - {predicted_label}")
    else:
        print(f"  Status: Low confidence - manual review suggested")
    print("")


if __name__ == "__main__":
    main()
