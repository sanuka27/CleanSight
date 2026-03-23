"""
CleanSight ML Phase 2 — Waste Category Model Evaluation (PyTorch)

Evaluates the trained Phase 2 model on real validation data and reports
comprehensive multi-class metrics including:
- Overall accuracy, loss
- Per-class precision, recall, F1-score
- Confusion matrix with visualization
- Weak class identification and analysis
- Detailed evaluation report

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
from datetime import datetime

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split
from torchvision import datasets
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
)

from ML.utils.model_utils import (
    get_device,
    create_model,
    get_val_transform,
    validate_split_sizes,
)

# Paths (relative to project root)
ML_DIR = os.path.join(os.path.dirname(__file__), os.pardir)
ML_DIR = os.path.abspath(ML_DIR)

DEFAULT_MODEL_PATH = os.path.join(ML_DIR, "models", "waste_category_classifier.pt")
DEFAULT_CLASS_NAMES_PATH = os.path.join(ML_DIR, "models", "category_class_names.json")
DEFAULT_DATASET_DIR = os.path.join(ML_DIR, "dataset_category")
ARTIFACTS_DIR = os.path.join(ML_DIR, "artifacts")
REPORTS_DIR = os.path.join(ML_DIR, "reports")

BATCH_SIZE = 32
VALIDATION_SPLIT = 0.2  # Must match training split
NUM_WORKERS = 0  # Set to 0 for Windows compatibility
RANDOM_SEED = 42  # Must match training seed

# Thresholds for weak class identification
WEAK_F1_THRESHOLD = 0.80  # Classes with F1 below this are flagged
WEAK_RECALL_THRESHOLD = 0.75  # Classes with recall below this are flagged


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


def save_confusion_matrix(cm, class_names, save_path, normalize=False):
    """Save a confusion matrix heatmap plot."""
    os.makedirs(os.path.dirname(save_path), exist_ok=True)

    fig, ax = plt.subplots(figsize=(10, 8))

    # Optionally normalize
    if normalize:
        row_sums = cm.sum(axis=1, keepdims=True)
        with np.errstate(divide="ignore", invalid="ignore"):
            cm_display = np.divide(
                cm.astype("float"),
                row_sums,
                where=row_sums != 0,
            )
        cm_display = np.nan_to_num(cm_display, nan=0.0)
        fmt = ".2f"
        title = "CleanSight Phase 2 - Normalized Confusion Matrix"
    else:
        cm_display = cm
        fmt = "d"
        title = "CleanSight Phase 2 - Confusion Matrix"

    sns.heatmap(
        cm_display, annot=True, fmt=fmt, cmap="Blues",
        xticklabels=class_names,
        yticklabels=class_names,
        ax=ax,
        annot_kws={"size": 12},
    )

    ax.set_xlabel("Predicted Label", fontsize=12)
    ax.set_ylabel("True Label", fontsize=12)
    ax.set_title(title, fontsize=14, fontweight='bold')

    # Add count totals on the side
    row_sums = cm.sum(axis=1)
    for i, (tick, total) in enumerate(zip(ax.get_yticklabels(), row_sums)):
        ax.text(len(class_names) + 0.3, i + 0.5, f"n={total}",
                va='center', fontsize=10, color='gray')

    plt.tight_layout()
    plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Confusion matrix saved to: {save_path}")


def save_per_class_metrics_plot(report_dict, class_names, save_path):
    """Save a bar chart comparing per-class metrics."""
    os.makedirs(os.path.dirname(save_path), exist_ok=True)

    metrics = ['precision', 'recall', 'f1-score']
    x = np.arange(len(class_names))
    width = 0.25

    fig, ax = plt.subplots(figsize=(12, 6))

    # Extract metrics for each class
    for i, metric in enumerate(metrics):
        values = [report_dict[cls][metric] for cls in class_names]
        bars = ax.bar(x + i * width, values, width, label=metric.capitalize())

        # Add value labels on bars
        for bar, val in zip(bars, values):
            height = bar.get_height()
            ax.annotate(f'{val:.2f}',
                        xy=(bar.get_x() + bar.get_width() / 2, height),
                        xytext=(0, 3),
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=9)

    ax.set_xlabel('Class', fontsize=12)
    ax.set_ylabel('Score', fontsize=12)
    ax.set_title('Per-Class Performance Metrics', fontsize=14, fontweight='bold')
    ax.set_xticks(x + width)
    ax.set_xticklabels(class_names, fontsize=11)
    ax.legend(loc='lower right', fontsize=10)
    ax.set_ylim([0, 1.15])
    ax.axhline(y=WEAK_F1_THRESHOLD, color='orange', linestyle='--', alpha=0.5, label=f'Weak threshold ({WEAK_F1_THRESHOLD})')
    ax.grid(axis='y', alpha=0.3)

    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()
    print(f"Per-class metrics plot saved to: {save_path}")


def identify_weak_classes(report_dict, class_names):
    """
    Identify classes that are performing poorly.

    Returns:
        list of dicts with class name, metrics, and issues
    """
    weak_classes = []

    for cls in class_names:
        if cls not in report_dict:
            continue

        metrics = report_dict[cls]
        issues = []

        if metrics['f1-score'] < WEAK_F1_THRESHOLD:
            issues.append(f"Low F1-score ({metrics['f1-score']:.3f} < {WEAK_F1_THRESHOLD})")

        if metrics['recall'] < WEAK_RECALL_THRESHOLD:
            issues.append(f"Low recall ({metrics['recall']:.3f} < {WEAK_RECALL_THRESHOLD})")

        if metrics['precision'] < metrics['recall'] * 0.8:
            issues.append(f"Precision significantly lower than recall (possible overconfident predictions)")

        if metrics['recall'] < metrics['precision'] * 0.8:
            issues.append(f"Recall significantly lower than precision (model misses many {cls} samples)")

        if issues:
            weak_classes.append({
                "class": cls,
                "precision": metrics['precision'],
                "recall": metrics['recall'],
                "f1-score": metrics['f1-score'],
                "support": metrics['support'],
                "issues": issues,
            })

    # Sort by F1-score (weakest first)
    weak_classes.sort(key=lambda x: x['f1-score'])

    return weak_classes


def analyze_confusion_pairs(cm, class_names, top_n=5):
    """
    Find the most common misclassification pairs.

    Returns:
        list of (true_class, pred_class, count) tuples
    """
    confusion_pairs = []

    for i, true_cls in enumerate(class_names):
        for j, pred_cls in enumerate(class_names):
            if i != j and cm[i, j] > 0:
                confusion_pairs.append((true_cls, pred_cls, int(cm[i, j])))

    # Sort by count descending
    confusion_pairs.sort(key=lambda x: x[2], reverse=True)

    return confusion_pairs[:top_n]


def save_evaluation_report(report_data, save_path):
    """Save comprehensive evaluation report as JSON."""
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)
    print(f"Evaluation report saved to: {save_path}")


def save_text_report(report_text, save_path):
    """Save evaluation report as human-readable text."""
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    with open(save_path, "w", encoding="utf-8") as f:
        f.write(report_text)
    print(f"Text report saved to: {save_path}")


def evaluate(model_path, class_names_path, dataset_dir):
    """Evaluate the trained category model on validation data."""
    print("=" * 65)
    print("  CleanSight Phase 2 - Category Model Evaluation")
    print("  (PyTorch Implementation)")
    print("=" * 65 + "\n")

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

    # Verify class order matches training (fail fast if mismatch)
    if dataset_class_names != class_names:
        print("ERROR: Dataset class names/order do not match training-time class names.")
        print(f"  Dataset classes:  {dataset_class_names}")
        print(f"  Training classes: {class_names}")
        print("Please ensure the evaluation dataset uses the exact same classes and ordering as during training.")
        sys.exit(1)

    # Calculate and validate split sizes (must match training)
    total_size = len(full_dataset)
    try:
        train_size, val_size = validate_split_sizes(total_size, VALIDATION_SPLIT)
    except ValueError as e:
        print(f"ERROR: {e}")
        sys.exit(1)

    # Split dataset with fixed seed for reproducibility (same as training)
    generator = torch.Generator().manual_seed(RANDOM_SEED)
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
    macro_precision = precision_score(y_true, y_pred, average='macro')
    macro_recall = recall_score(y_true, y_pred, average='macro')
    macro_f1 = f1_score(y_true, y_pred, average='macro')
    weighted_f1 = f1_score(y_true, y_pred, average='weighted')

    print("\n" + "=" * 65)
    print("  Overall Metrics")
    print("=" * 65)
    print(f"\n  Validation Loss:      {val_loss:.4f}")
    print(f"  Validation Accuracy:  {val_acc:.4f}  ({val_acc*100:.2f}%)")
    print(f"\n  Macro Precision:      {macro_precision:.4f}")
    print(f"  Macro Recall:         {macro_recall:.4f}")
    print(f"  Macro F1-Score:       {macro_f1:.4f}")
    print(f"  Weighted F1-Score:    {weighted_f1:.4f}")

    # Classification report (precision, recall, F1-score per class)
    print("\n" + "=" * 65)
    print("  Per-Class Metrics")
    print("=" * 65)
    report = classification_report(
        y_true, y_pred,
        labels=list(range(len(class_names))),
        target_names=class_names,
        digits=4,
        zero_division=0,
    )
    print(report)

    # Get report as dictionary for analysis
    report_dict = classification_report(
        y_true, y_pred,
        labels=list(range(len(class_names))),
        target_names=class_names,
        digits=4,
        output_dict=True,
        zero_division=0,
    )

    # Identify weak classes
    weak_classes = identify_weak_classes(report_dict, class_names)

    if weak_classes:
        print("=" * 65)
        print("  Weak Class Analysis")
        print("=" * 65)
        print("\n  The following classes need improvement:\n")

        for wc in weak_classes:
            print(f"  {wc['class'].upper()} (F1: {wc['f1-score']:.3f}, Support: {wc['support']})")
            for issue in wc['issues']:
                print(f"    - {issue}")
            print()

    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(class_names))))
    print("=" * 65)
    print("  Confusion Matrix")
    print("=" * 65)
    print("\n  Rows = True labels, Columns = Predicted labels\n")

    # Print formatted confusion matrix
    header = "           " + "  ".join(f"{cls[:6]:>6}" for cls in class_names)
    print(header)
    print("  " + "-" * (len(header) - 2))
    for i, cls in enumerate(class_names):
        row = f"  {cls[:8]:8s}  " + "  ".join(f"{cm[i, j]:6d}" for j in range(len(class_names)))
        print(row)

    # Analyze common misclassifications
    confusion_pairs = analyze_confusion_pairs(cm, class_names, top_n=5)

    if confusion_pairs:
        print("\n  Most Common Misclassifications:")
        for true_cls, pred_cls, count in confusion_pairs:
            print(f"    {true_cls} -> {pred_cls}: {count} samples")

    # Save artifacts
    print("\n" + "=" * 65)
    print("  Saving Artifacts")
    print("=" * 65 + "\n")

    # Confusion matrix plots
    cm_save_path = os.path.join(ARTIFACTS_DIR, "category_confusion_matrix.png")
    save_confusion_matrix(cm, class_names, cm_save_path, normalize=False)

    cm_norm_save_path = os.path.join(ARTIFACTS_DIR, "category_confusion_matrix_normalized.png")
    save_confusion_matrix(cm, class_names, cm_norm_save_path, normalize=True)

    # Per-class metrics plot
    metrics_plot_path = os.path.join(ARTIFACTS_DIR, "category_per_class_metrics.png")
    save_per_class_metrics_plot(report_dict, class_names, metrics_plot_path)

    # Comprehensive JSON report
    evaluation_report = {
        "timestamp": datetime.now().isoformat(),
        "model_path": model_path,
        "dataset_path": dataset_dir,
        "validation_samples": len(val_dataset),
        "class_names": class_names,
        "overall_metrics": {
            "loss": val_loss,
            "accuracy": val_acc,
            "macro_precision": macro_precision,
            "macro_recall": macro_recall,
            "macro_f1": macro_f1,
            "weighted_f1": weighted_f1,
        },
        "per_class_metrics": {
            cls: {
                "precision": report_dict[cls]['precision'],
                "recall": report_dict[cls]['recall'],
                "f1-score": report_dict[cls]['f1-score'],
                "support": report_dict[cls]['support'],
            }
            for cls in class_names
        },
        "confusion_matrix": cm.tolist(),
        "weak_classes": weak_classes,
        "common_misclassifications": [
            {"true": t, "predicted": p, "count": c}
            for t, p, c in confusion_pairs
        ],
    }

    report_save_path = os.path.join(REPORTS_DIR, "category_evaluation_report.json")
    save_evaluation_report(evaluation_report, report_save_path)

    # Human-readable text report
    text_report = f"""CleanSight Phase 2 - Category Model Evaluation Report
{'=' * 55}
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

MODEL INFORMATION
{'-' * 55}
Model Path: {model_path}
Dataset Path: {dataset_dir}
Validation Samples: {len(val_dataset)}
Classes: {', '.join(class_names)}

OVERALL METRICS
{'-' * 55}
Accuracy:         {val_acc:.4f} ({val_acc*100:.2f}%)
Loss:             {val_loss:.4f}
Macro Precision:  {macro_precision:.4f}
Macro Recall:     {macro_recall:.4f}
Macro F1-Score:   {macro_f1:.4f}
Weighted F1:      {weighted_f1:.4f}

PER-CLASS METRICS
{'-' * 55}
{report}

CONFUSION MATRIX
{'-' * 55}
{header}
"""
    for i, cls in enumerate(class_names):
        row = f"{cls[:8]:8s}  " + "  ".join(f"{cm[i, j]:6d}" for j in range(len(class_names)))
        text_report += row + "\n"

    if weak_classes:
        text_report += f"\nWEAK CLASSES (F1 < {WEAK_F1_THRESHOLD})\n{'-' * 55}\n"
        for wc in weak_classes:
            text_report += f"\n{wc['class'].upper()} (F1: {wc['f1-score']:.3f})\n"
            for issue in wc['issues']:
                text_report += f"  - {issue}\n"

    if confusion_pairs:
        text_report += f"\nCOMMON MISCLASSIFICATIONS\n{'-' * 55}\n"
        for true_cls, pred_cls, count in confusion_pairs:
            text_report += f"  {true_cls} -> {pred_cls}: {count} samples\n"

    text_report += f"\n{'=' * 55}\nEnd of Report\n"

    text_report_path = os.path.join(REPORTS_DIR, "category_evaluation_report.txt")
    save_text_report(text_report, text_report_path)

    print("\n" + "=" * 65)
    print("  EVALUATION COMPLETE")
    print("=" * 65 + "\n")

    # Summary with recommendations
    if weak_classes:
        print("  Summary: Model has weak performance on some classes.")
        print("  Consider:")
        print("    - Adding more training data for weak classes")
        print("    - Adjusting class weights")
        print("    - Using data augmentation targeted at weak classes")
    else:
        print("  Summary: Model is performing well across all classes.")

    print("\n  Artifacts saved to:")
    print(f"    - {cm_save_path}")
    print(f"    - {cm_norm_save_path}")
    print(f"    - {metrics_plot_path}")
    print(f"    - {report_save_path}")
    print(f"    - {text_report_path}")
    print()


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
