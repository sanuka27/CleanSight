"""CLI utility for Phase 2 category prediction using shared runtime."""

from __future__ import annotations

import argparse
import json
import os
import sys


try:
    from ML.inference.category_runtime import load_category_model, predict_category
    from ML.preprocessing.image import ImagePreprocessError, read_image_file
except ImportError:
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    if PROJECT_ROOT not in sys.path:
        sys.path.insert(0, PROJECT_ROOT)
    from ML.inference.category_runtime import load_category_model, predict_category
    from ML.preprocessing.image import ImagePreprocessError, read_image_file


def print_human_readable(result: dict, top_k: int | None = None) -> None:
    if not result.get("success"):
        print(f"ERROR: {result.get('error', 'Prediction failed')}")
        return

    predictions = list(result.get("all_predictions", []))
    if isinstance(top_k, int) and top_k > 0:
        predictions = predictions[:top_k]

    print("\n=======================================================")
    print("  PHASE 2 CATEGORY PREDICTION RESULT")
    print("=======================================================")
    print(f"Predicted Category: {result['predicted_class'].upper()}")
    print(f"Confidence:         {result['confidence']:.2%}")
    print(f"Entropy:            {result['entropy']:.3f}")
    print(f"Confidence Level:   {result['confidence_level']}")
    print(f"Review Status:      {result['review_status']}")
    print("-------------------------------------------------------")

    if predictions:
        print("All Predictions:")
        for idx, item in enumerate(predictions, start=1):
            marker = " <-- top" if idx == 1 else ""
            print(f"  {idx}. {item['class_name']:<10s} {item['confidence']:.2%}{marker}")
    print("=======================================================\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Predict waste category from an image")
    parser.add_argument("--image", required=True, help="Path to image file")
    parser.add_argument("--top-k", type=int, default=None, help="Optional top-k predictions to display")
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON output")
    args = parser.parse_args()

    if not load_category_model():
        failure = {"success": False, "error": "Category model could not be loaded"}
        print(json.dumps(failure) if args.json else failure["error"])
        sys.exit(1)

    try:
        image_bytes = read_image_file(args.image)
    except ImagePreprocessError as exc:
        failure = {"success": False, "error": str(exc)}
        print(json.dumps(failure) if args.json else failure["error"])
        sys.exit(1)

    result = predict_category(image_bytes)

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print_human_readable(result, top_k=args.top_k)

    if not result.get("success"):
        sys.exit(1)


if __name__ == "__main__":
    main()
