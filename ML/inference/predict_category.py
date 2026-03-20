"""
CleanSight ML Phase 2 — Waste Category Prediction (Inference)

Loads the trained Phase 2 model and predicts the waste category
(plastic, paper, glass, or mixed) for a single image.

Usage (from project root):
    python -m ML.inference.predict_category --image <path_to_image>

Options:
    --model   Path to model file (default: ML/models/waste_category_classifier.keras)
    --labels  Path to class names JSON (default: ML/models/category_class_names.json)
"""

import os
import sys
import json
import argparse

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import numpy as np
import tensorflow as tf
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

# Paths (relative to project root)
ML_DIR = os.path.join(os.path.dirname(__file__), os.pardir)
ML_DIR = os.path.abspath(ML_DIR)

DEFAULT_MODEL_PATH = os.path.join(ML_DIR, "models", "waste_category_classifier.keras")
DEFAULT_CLASS_NAMES_PATH = os.path.join(ML_DIR, "models", "category_class_names.json")

IMG_SIZE = (224, 224)


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


def predict_category(model, image_path, class_names):
    """Predict the waste category for a single image."""
    # Load and preprocess the image
    try:
        img = tf.keras.utils.load_img(image_path, target_size=IMG_SIZE)
        img_array = tf.keras.utils.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = preprocess_input(img_array)
    except Exception as e:
        print(f"ERROR: Failed to load or preprocess image: {image_path}")
        print(f"Reason: {e}")
        print("Please ensure the file is a valid/decodable image.")
        sys.exit(1)

    # Run inference
    predictions = model.predict(img_array, verbose=0)
    predicted_index = np.argmax(predictions[0])
    confidence = float(predictions[0][predicted_index])
    predicted_label = class_names[predicted_index]

    return predicted_label, confidence, predictions[0]


def main():
    parser = argparse.ArgumentParser(
        description="CleanSight Phase 2 — Predict waste category from an image"
    )
    parser.add_argument(
        "--image", type=str, required=True,
        help="Path to the image file to classify"
    )
    parser.add_argument(
        "--model", type=str, default=DEFAULT_MODEL_PATH,
        help="Path to the trained model file (.keras)"
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

    # Load model
    print("Loading model...")
    model = tf.keras.models.load_model(args.model)

    # Predict
    predicted_label, confidence, all_scores = predict_category(model, args.image, class_names)

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
        print(f"  Status: High confidence — {predicted_label}")
    elif confidence >= 0.5:
        print(f"  Status: Moderate confidence — {predicted_label}")
    else:
        print(f"  Status: Low confidence — manual review suggested")
    print("")


if __name__ == "__main__":
    main()
