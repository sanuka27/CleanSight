"""
CleanSight ML Phase 2 — Waste Category Model Evaluation (PyTorch)

Evaluates the trained Phase 2 model on real validation data and reports
multi-class metrics: accuracy, precision, recall, F1-score, and confusion matrix.

This implementation uses PyTorch for Python 3.14.3 compatibility on Windows.

Usage (from project root):
    python -m ML.evaluation.evaluate_category_model

Options:
    --model    Path to model file (default: ML/models/waste_category_classifier.pt)
    --labels   Path to class names JSON (default: ML/models/category_class_names.json)
    --dataset  Path to dataset directory (default: ML/dataset_category)
"""

import os
import sys
import json
import argparse

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms, models
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

# Paths (relative to project root)
ML_DIR = os.path.join(os.path.dirname(__file__), os.pardir)
ML_DIR = os.path.abspath(ML_DIR)

DEFAULT_MODEL_PATH = os.path.join(ML_DIR, "models", "waste_category_classifier.pt")
DEFAULT_CLASS_NAMES_PATH = os.path.join(ML_DIR, "models", "category_class_names.json")
DEFAULT_DATASET_DIR = os.path.join(ML_DIR, "dataset_category")
ARTIFACTS_DIR = os.path.join(ML_DIR, "artifacts")

IMG_SIZE = 224
BATCH_SIZE = 32
VALIDATION_SPLIT = 0.2  # Must match training split
NUM_WORKERS = 0  # Set to 0 for Windows compatibility


def get_device():
    """Get the best available device (CUDA, MPS, or CPU)."""
    if torch.cuda.is_available():
        return torch.device("cuda")
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return torch.device("mps")
    else:
        return torch.device("cpu")


def get_val_transform():
    """Get the transform for validation (must match training validation transform)."""
    mean = [0.485, 0.456, 0.406]
    std = [0.229, 0.224, 0.225]

    return transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=mean, std=std),
    ])


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


def create_model(num_classes):
    """Create the model architecture (must match training)."""
    model = models.mobilenet_v3_small(weights=None)

    # Replace the classifier head (same architecture as training)
    in_features = model.classifier[0].in_features
    model.classifier = nn.Sequential(
        nn.Linear(in_features, 256),
        nn.Hardswish(),
        nn.Dropout(p=0.3),
        nn.Linear(256, 128),
        nn.Hardswish(),
        nn.Dropout(p=0.2),
        nn.Linear(128, num_classes),
    )

    return model


def load_model(model_path, num_classes, device):
    """Load the trained model weights."""
    model = create_model(num_classes)
    model.load_state_dict(torch.load(model_path, map_location=device, weights_only=True))
    model = model.to(device)
    model.eval()
    return model


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
    ax.set_title("CleanSight Phase 2 - Category Confusion Matrix")
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()
    print(f"Confusion matrix saved to: {save_path}")


def save_evaluation_report(report_dict, save_path):
    """Save evaluation report as JSON."""
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(report_dict, f, indent=2)
    print(f"Evaluation report saved to: {save_path}")


def evaluate(model_path, class_names_path, dataset_dir):
    """Evaluate the trained category model on validation data."""
    print("=" * 60)
    print("  CleanSight Phase 2 - Category Model Evaluation")
    print("  (PyTorch Implementation)")
    print("=" * 60 + "\n")

    # Validate dataset directory
    if not os.path.isdir(dataset_dir):
        print(f"ERROR: Dataset directory not found: {dataset_dir}")
        print("Please ensure ML/dataset_category/ exists with class subfolders.")
        sys.exit(1)

    # Load class names from training
    class_names = load_class_names(class_names_path)
    num_classes = len(class_names)
    print(f"Class names (from training): {class_names}")

    # Get device
    device = get_device()
    print(f"Using device: {device}")

    # Load model
    print(f"\nLoading model from: {model_path}")
    if not os.path.exists(model_path):
        print(f"ERROR: Model file not found: {model_path}")
        print("Please train the model first:")
        print("  python -m ML.training.train_category_model")
        sys.exit(1)

    model = load_model(model_path, num_classes, device)

    # Load validation dataset with the SAME seed and split as training
    print("\nLoading validation dataset...")
    val_transform = get_val_transform()

    # Load full dataset and split with same seed as training
    full_dataset = datasets.ImageFolder(dataset_dir)
    dataset_class_names = full_dataset.classes

    # Verify class order matches training
    if dataset_class_names != class_names:
        print(f"WARNING: Dataset class order {dataset_class_names} differs from training {class_names}")
        print("This may cause incorrect evaluation results.")

    # Calculate split sizes (must match training)
    total_size = len(full_dataset)
    val_size = int(total_size * VALIDATION_SPLIT)
    train_size = total_size - val_size

    # Split dataset with fixed seed for reproducibility (same as training)
    generator = torch.Generator().manual_seed(42)
    _, val_indices = random_split(
        range(total_size), [train_size, val_size], generator=generator
    )

    # Create validation dataset with transform
    class TransformedSubset(torch.utils.data.Dataset):
        """Subset with custom transform."""
        def __init__(self, dataset, indices, transform):
            self.dataset = dataset
            self.indices = list(indices)
            self.transform = transform

        def __len__(self):
            return len(self.indices)

        def __getitem__(self, idx):
            img, label = self.dataset[self.indices[idx]]
            if self.transform:
                img = self.transform(img)
            return img, label

    full_dataset_raw = datasets.ImageFolder(dataset_dir)
    val_dataset = TransformedSubset(full_dataset_raw, val_indices.indices, val_transform)

    val_loader = DataLoader(
        val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=NUM_WORKERS
    )

    print(f"Validation samples: {len(val_dataset)}")

    # Collect all predictions and true labels
    print("\nRunning evaluation...")
    y_true = []
    y_pred = []
    running_loss = 0.0
    criterion = nn.CrossEntropyLoss()

    with torch.no_grad():
        for images, labels in val_loader:
            images, labels = images.to(device), labels.to(device)

            outputs = model(images)
            loss = criterion(outputs, labels)
            running_loss += loss.item() * images.size(0)

            _, predicted = outputs.max(1)
            y_true.extend(labels.cpu().numpy())
            y_pred.extend(predicted.cpu().numpy())

    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    # Calculate overall metrics
    val_loss = running_loss / len(val_dataset)
    val_acc = accuracy_score(y_true, y_pred)

    print(f"\nOverall Validation Loss:     {val_loss:.4f}")
    print(f"Overall Validation Accuracy: {val_acc:.4f}")

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

    # Get report as dictionary for saving
    report_dict = classification_report(
        y_true, y_pred,
        target_names=class_names,
        digits=4,
        output_dict=True,
    )
    report_dict["overall_loss"] = val_loss
    report_dict["overall_accuracy"] = val_acc

    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred)
    print("Confusion Matrix:")
    print(cm)

    # Save artifacts
    cm_save_path = os.path.join(ARTIFACTS_DIR, "category_confusion_matrix.png")
    save_confusion_matrix(cm, class_names, cm_save_path)

    report_save_path = os.path.join(ARTIFACTS_DIR, "category_evaluation_report.json")
    save_evaluation_report(report_dict, report_save_path)

    print("\n" + "=" * 60)
    print("  EVALUATION COMPLETE")
    print("=" * 60 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="CleanSight Phase 2 - Evaluate waste category model (PyTorch)"
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
