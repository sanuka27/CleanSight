"""
CleanSight ML Phase 2 — Waste Category Model Evaluation

Evaluates the trained Phase 2 model on real validation data and reports
multi-class metrics: accuracy, precision, recall, F1-score, and confusion matrix.

Usage (from project root):
    python -m ML.evaluation.evaluate_category_model

Options:
    --model    Path to model file (default: ML/models/waste_category_classifier.keras)
    --labels   Path to class names JSON (default: ML/models/category_class_names.json)
    --dataset  Path to dataset directory (default: ML/dataset_category)
"""

import os
import sys
import json
import argparse

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix

# Paths (relative to project root)
ML_DIR = os.path.join(os.path.dirname(__file__), os.pardir)
ML_DIR = os.path.abspath(ML_DIR)

DEFAULT_MODEL_PATH = os.path.join(ML_DIR, "models", "waste_category_classifier.keras")
DEFAULT_CLASS_NAMES_PATH = os.path.join(ML_DIR, "models", "category_class_names.json")
DEFAULT_DATASET_DIR = os.path.join(ML_DIR, "dataset_category")
ARTIFACTS_DIR = os.path.join(ML_DIR, "artifacts")

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
VALIDATION_SPLIT = 0.2  # Must match training split


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


def save_confusion_matrix(cm, class_names, save_path):
    """Save a confusion matrix heatmap plot."""
    os.makedirs(os.path.dirname(save_path), exist_ok=True)

    fig, ax = plt.subplots(figsize=(8, 6))
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="Blues",
        xticklabels=class_names,
        yticklabels=class_names,
        ax=ax,
    )
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title("CleanSight Phase 2 — Category Confusion Matrix")
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()
    print(f"Confusion matrix saved to: {save_path}")


def evaluate(model_path, class_names_path, dataset_dir):
    """Evaluate the trained category model on validation data."""
    print("=" * 60)
    print("  CleanSight Phase 2 — Category Model Evaluation")
    print("=" * 60 + "\n")

    # Validate dataset directory
    if not os.path.isdir(dataset_dir):
        print(f"ERROR: Dataset directory not found: {dataset_dir}")
        print("Please ensure ML/dataset_category/ exists with class subfolders.")
        sys.exit(1)

    # Load class names from training
    class_names = load_class_names(class_names_path)
    print(f"Class names (from training): {class_names}")

    # Load validation dataset with the SAME seed and split as training
    print("\nLoading validation dataset...")
    val_ds = tf.keras.utils.image_dataset_from_directory(
        dataset_dir,
        validation_split=VALIDATION_SPLIT,
        subset="validation",
        seed=42,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="categorical",
    )

    # Verify class order matches training
    dataset_class_names = val_ds.class_names
    if dataset_class_names != class_names:
        print(f"WARNING: Dataset class order {dataset_class_names} differs from training {class_names}")
        print("This may cause incorrect evaluation results.")

    # Load model
    print(f"\nLoading model from: {model_path}")
    if not os.path.exists(model_path):
        print(f"ERROR: Model file not found: {model_path}")
        print("Please train the model first:")
        print("  python -m ML.training.train_category_model")
        sys.exit(1)

    model = tf.keras.models.load_model(model_path)

    # Evaluate overall metrics
    print("\nRunning evaluation...")
    val_loss, val_acc = model.evaluate(val_ds)
    print(f"\nOverall Validation Loss:     {val_loss:.4f}")
    print(f"Overall Validation Accuracy: {val_acc:.4f}")

    # Collect all predictions and true labels
    y_true = []
    y_pred = []

    for images, labels in val_ds:
        predictions = model.predict(images, verbose=0)
        y_true.extend(np.argmax(labels.numpy(), axis=1))
        y_pred.extend(np.argmax(predictions, axis=1))

    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    # Classification report (precision, recall, F1-score per class)
    print("\n" + "=" * 60)
    print("  Per-Class Metrics")
    print("=" * 60)
    report = classification_report(
        y_true, y_pred,
        target_names=class_names,
        digits=4,
    )
    print(report)

    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred)
    print("Confusion Matrix:")
    print(cm)

    # Save confusion matrix plot
    cm_save_path = os.path.join(ARTIFACTS_DIR, "category_confusion_matrix.png")
    save_confusion_matrix(cm, class_names, cm_save_path)

    print("\n" + "=" * 60)
    print("  EVALUATION COMPLETE")
    print("=" * 60 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="CleanSight Phase 2 — Evaluate waste category model"
    )
    parser.add_argument(
        "--model", type=str, default=DEFAULT_MODEL_PATH,
        help="Path to the trained model file (.keras)"
    )
    parser.add_argument(
        "--labels", type=str, default=DEFAULT_CLASS_NAMES_PATH,
        help="Path to the class names JSON file"
    )
    parser.add_argument(
        "--dataset", type=str, default=DEFAULT_DATASET_DIR,
        help="Path to the dataset directory"
    )
    args = parser.parse_args()

    evaluate(
        model_path=args.model,
        class_names_path=args.labels,
        dataset_dir=args.dataset,
    )


if __name__ == "__main__":
    main()
