"""
CleanSight ML Phase 2 — Waste Category Classification Training Pipeline (PyTorch)

Trains a MobileNetV3-Small-based multi-class classifier to categorize waste images
into: plastic, paper, glass, or mixed.

This implementation uses PyTorch for Python 3.14.3 compatibility on Windows.

Features:
- Transfer learning with MobileNetV3-Small backbone
- Two-phase training: frozen backbone -> fine-tuning
- Class imbalance handling via weighted loss function
- Best model checkpointing based on validation accuracy
- Training history visualization
- Reproducible training with fixed random seed

Usage (from project root):
    python -m ML.training.train_category_model

Options:
    --no-class-weights    Disable class weighting (not recommended for imbalanced data)
    --epochs              Total epochs for initial training (default: 15)
    --fine-tune-epochs    Epochs for fine-tuning phase (default: 10)

Requirements:
    - Real images must be present in ML/dataset_category/{plastic,paper,glass,mixed}/
    - PyTorch, torchvision, matplotlib, numpy
"""

import os
import sys
import json
import copy
import argparse
import random
from datetime import datetime
from collections import Counter

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
from torchvision import datasets

from ML.utils.model_utils import (
    get_device,
    create_model,
    get_data_transforms,
    validate_split_sizes,
    IMG_SIZE,
)

# ── Configuration ──────────────────────────────────────────────────────────────

RANDOM_SEED = 42
BATCH_SIZE = 32
INITIAL_EPOCHS = 15
FINE_TUNE_EPOCHS = 10
VALIDATION_SPLIT = 0.2
LEARNING_RATE = 1e-3
FINE_TUNE_LR = 1e-5
NUM_WORKERS = 0  # Set to 0 for Windows compatibility

# Paths (relative to project root)
ML_DIR = os.path.join(os.path.dirname(__file__), os.pardir)
ML_DIR = os.path.abspath(ML_DIR)

DATASET_DIR = os.path.join(ML_DIR, "dataset_category")
MODELS_DIR = os.path.join(ML_DIR, "models")
ARTIFACTS_DIR = os.path.join(ML_DIR, "artifacts")
REPORTS_DIR = os.path.join(ML_DIR, "reports")

MODEL_SAVE_PATH = os.path.join(MODELS_DIR, "waste_category_classifier.pt")
CLASS_NAMES_PATH = os.path.join(MODELS_DIR, "category_class_names.json")
HISTORY_PLOT_PATH = os.path.join(ARTIFACTS_DIR, "category_training_history.png")
HISTORY_JSON_PATH = os.path.join(ARTIFACTS_DIR, "category_training_history.json")
TRAINING_REPORT_PATH = os.path.join(REPORTS_DIR, "category_training_report.json")

EXPECTED_CLASSES = ["glass", "mixed", "paper", "plastic"]


# ── Reproducibility ───────────────────────────────────────────────────────────

def set_seed(seed):
    """Set random seed for reproducibility across all libraries."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
    # For deterministic behavior (may slow down training slightly)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


# ── Helpers ────────────────────────────────────────────────────────────────────


def validate_dataset_dir(dataset_dir):
    """Check that the dataset directory exists and contains exactly the expected class folders."""
    if not os.path.isdir(dataset_dir):
        print(f"ERROR: Dataset directory not found: {dataset_dir}")
        print("Please create ML/dataset_category/ with subfolders: plastic, paper, glass, mixed")
        sys.exit(1)

    found_classes = sorted([
        d for d in os.listdir(dataset_dir)
        if os.path.isdir(os.path.join(dataset_dir, d))
    ])

    if not found_classes:
        print(f"ERROR: No class subdirectories found in {dataset_dir}")
        print(f"Expected subfolders: {EXPECTED_CLASSES}")
        sys.exit(1)

    # Enforce expected classes
    missing = [c for c in EXPECTED_CLASSES if c not in found_classes]
    if missing:
        print(f"ERROR: Missing required class folders: {missing}")
        print(f"Expected subfolders: {EXPECTED_CLASSES}")
        sys.exit(1)

    unexpected = [c for c in found_classes if c not in EXPECTED_CLASSES]
    if unexpected:
        print(f"ERROR: Unexpected class folders found: {unexpected}")
        print(f"Expected exactly these subfolders: {EXPECTED_CLASSES}")
        print("ImageFolder will treat all subfolders as classes, which changes label ordering.")
        print("Please remove unexpected folders or update EXPECTED_CLASSES.")
        sys.exit(1)

    # Check each expected folder has at least some images
    empty_folders = []
    for cls in EXPECTED_CLASSES:
        cls_path = os.path.join(dataset_dir, cls)
        files = [f for f in os.listdir(cls_path) if os.path.isfile(os.path.join(cls_path, f))]
        if len(files) == 0:
            empty_folders.append(cls)

    if empty_folders:
        print(f"ERROR: The following class folders are empty: {empty_folders}")
        print("Each class folder must contain real images for training.")
        sys.exit(1)

    print(f"Dataset directory: {dataset_dir}")
    print(f"Found classes: {EXPECTED_CLASSES}")
    return EXPECTED_CLASSES


def get_class_distribution(dataset):
    """
    Calculate class distribution from a dataset.

    Returns:
        dict mapping class_idx to count
    """
    if hasattr(dataset, 'targets'):
        # Standard ImageFolder dataset
        targets = dataset.targets
    else:
        # For subsets, we need to iterate
        targets = [dataset[i][1] for i in range(len(dataset))]

    return dict(Counter(targets))


def compute_class_weights(class_counts, num_classes, strategy="balanced"):
    """
    Compute class weights for handling class imbalance.

    Args:
        class_counts: dict mapping class_idx to sample count
        num_classes: total number of classes
        strategy: "balanced" (inverse frequency) or "sqrt" (square root inverse)

    Returns:
        torch.Tensor of class weights
    """
    total_samples = sum(class_counts.values())
    weights = torch.zeros(num_classes)

    for class_idx in range(num_classes):
        count = class_counts.get(class_idx, 1)  # Avoid division by zero
        if strategy == "balanced":
            # Inverse frequency: classes with fewer samples get higher weight
            weights[class_idx] = total_samples / (num_classes * count)
        elif strategy == "sqrt":
            # Square root dampening for less aggressive weighting
            weights[class_idx] = np.sqrt(total_samples / (num_classes * count))
        else:
            weights[class_idx] = 1.0

    # Normalize weights so the average is 1.0
    weights = weights / weights.mean()

    return weights


def print_class_distribution(class_counts, class_names, title="Class Distribution"):
    """Print a formatted class distribution summary."""
    total = sum(class_counts.values())
    print(f"\n  {title}:")
    print("  " + "-" * 50)

    max_count = max(class_counts.values()) if class_counts else 1

    for idx, name in enumerate(class_names):
        count = class_counts.get(idx, 0)
        pct = count / total * 100 if total > 0 else 0
        bar_len = int(count / max_count * 25)
        bar = "█" * bar_len
        print(f"    {name:10s}  {count:5d}  ({pct:5.1f}%)  {bar}")

    # Check for imbalance
    if class_counts:
        min_count = min(class_counts.values())
        max_count = max(class_counts.values())
        if min_count > 0:
            ratio = max_count / min_count
            print("  " + "-" * 50)
            print(f"    Imbalance ratio: {ratio:.2f}:1")
            if ratio >= 3.0:
                print("    ⚠ WARNING: Significant class imbalance detected.")
                print("    Class weighting will be applied to handle this.")


def train_one_epoch(model, dataloader, criterion, optimizer, device):
    """Train the model for one epoch."""
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for images, labels in dataloader:
        images, labels = images.to(device), labels.to(device)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * images.size(0)
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()

    epoch_loss = running_loss / total
    epoch_acc = correct / total
    return epoch_loss, epoch_acc


def validate(model, dataloader, criterion, device):
    """Validate the model on the validation set."""
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels in dataloader:
            images, labels = images.to(device), labels.to(device)

            outputs = model(images)
            loss = criterion(outputs, labels)

            running_loss += loss.item() * images.size(0)
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()

    epoch_loss = running_loss / total
    epoch_acc = correct / total
    return epoch_loss, epoch_acc


def save_training_history(history, save_path, fine_tune_start=None):
    """Save training accuracy and loss plots."""
    os.makedirs(os.path.dirname(save_path), exist_ok=True)

    epochs_range = range(1, len(history["train_acc"]) + 1)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    # Accuracy plot
    ax1.plot(epochs_range, history["train_acc"], 'b-', label="Train Accuracy", linewidth=2)
    ax1.plot(epochs_range, history["val_acc"], 'r-', label="Val Accuracy", linewidth=2)
    if fine_tune_start:
        ax1.axvline(x=fine_tune_start, color="gray", linestyle="--", label="Fine-Tune Start")

    # Mark best epoch
    best_epoch = history["val_acc"].index(max(history["val_acc"])) + 1
    best_acc = max(history["val_acc"])
    ax1.scatter([best_epoch], [best_acc], color='green', s=100, zorder=5, label=f"Best ({best_acc:.4f})")

    ax1.set_title("Category Model - Accuracy")
    ax1.set_xlabel("Epoch")
    ax1.set_ylabel("Accuracy")
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    ax1.set_ylim([0, 1.05])

    # Loss plot
    ax2.plot(epochs_range, history["train_loss"], 'b-', label="Train Loss", linewidth=2)
    ax2.plot(epochs_range, history["val_loss"], 'r-', label="Val Loss", linewidth=2)
    if fine_tune_start:
        ax2.axvline(x=fine_tune_start, color="gray", linestyle="--", label="Fine-Tune Start")

    ax2.set_title("Category Model - Loss")
    ax2.set_xlabel("Epoch")
    ax2.set_ylabel("Loss")
    ax2.legend()
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()
    print(f"Training history plot saved to: {save_path}")


def save_training_history_json(history, save_path):
    """Save training history as JSON for later analysis."""
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)
    print(f"Training history JSON saved to: {save_path}")


def save_training_report(report, save_path):
    """Save a comprehensive training report."""
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"Training report saved to: {save_path}")


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="CleanSight Phase 2 - Train waste category classifier (PyTorch)"
    )
    parser.add_argument(
        "--no-class-weights", action="store_true",
        help="Disable class weighting for loss function"
    )
    parser.add_argument(
        "--epochs", type=int, default=INITIAL_EPOCHS,
        help=f"Number of epochs for initial training (default: {INITIAL_EPOCHS})"
    )
    parser.add_argument(
        "--fine-tune-epochs", type=int, default=FINE_TUNE_EPOCHS,
        help=f"Number of epochs for fine-tuning (default: {FINE_TUNE_EPOCHS})"
    )
    args = parser.parse_args()

    print("=" * 65)
    print("  CleanSight Phase 2 - Waste Category Classifier Training")
    print("  (PyTorch Implementation)")
    print("=" * 65 + "\n")

    # 1. Set random seed for reproducibility
    print(f"Setting random seed: {RANDOM_SEED}")
    set_seed(RANDOM_SEED)

    # 2. Validate dataset
    validate_dataset_dir(DATASET_DIR)

    # 3. Get device
    device = get_device()
    print(f"\nUsing device: {device}")

    # 4. Prepare data transforms
    train_transform, val_transform = get_data_transforms()

    # 5. Load full dataset and get class info
    print("\nLoading dataset...")
    full_dataset = datasets.ImageFolder(DATASET_DIR)
    class_names = full_dataset.classes
    num_classes = len(class_names)

    print(f"Class names: {class_names}")
    print(f"Number of classes: {num_classes}")
    print(f"Total images: {len(full_dataset)}")

    # 6. Print dataset summary before training
    full_class_counts = get_class_distribution(full_dataset)
    print_class_distribution(full_class_counts, class_names, "Full Dataset Distribution")

    # 7. Calculate and validate split sizes
    total_size = len(full_dataset)
    try:
        train_size, val_size = validate_split_sizes(total_size, VALIDATION_SPLIT)
    except ValueError as e:
        print(f"ERROR: {e}")
        sys.exit(1)

    # 8. Split dataset with fixed seed for reproducibility
    generator = torch.Generator().manual_seed(RANDOM_SEED)
    train_indices, val_indices = random_split(
        range(total_size), [train_size, val_size], generator=generator
    )

    # 9. Create datasets with appropriate transforms
    class TransformedSubset(torch.utils.data.Dataset):
        """Subset with custom transform."""
        def __init__(self, dataset, indices, transform):
            self.dataset = dataset
            self.indices = list(indices)
            self.transform = transform
            # Cache targets for faster access
            self._targets = [dataset.targets[i] for i in self.indices]

        def __len__(self):
            return len(self.indices)

        def __getitem__(self, idx):
            img, label = self.dataset[self.indices[idx]]
            if self.transform:
                img = self.transform(img)
            return img, label

        @property
        def targets(self):
            return self._targets

    # Reload dataset without transform for subset creation
    full_dataset_raw = datasets.ImageFolder(DATASET_DIR)
    train_dataset = TransformedSubset(full_dataset_raw, train_indices.indices, train_transform)
    val_dataset = TransformedSubset(full_dataset_raw, val_indices.indices, val_transform)

    print(f"\nTraining samples: {len(train_dataset)}")
    print(f"Validation samples: {len(val_dataset)}")

    # 10. Get class distribution for training set (for class weights)
    train_class_counts = get_class_distribution(train_dataset)
    print_class_distribution(train_class_counts, class_names, "Training Set Distribution")

    # 11. Create data loaders
    train_loader = DataLoader(
        train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=NUM_WORKERS
    )
    val_loader = DataLoader(
        val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=NUM_WORKERS
    )

    # 12. Save class names for reuse in inference and evaluation
    os.makedirs(MODELS_DIR, exist_ok=True)
    with open(CLASS_NAMES_PATH, "w", encoding="utf-8") as f:
        json.dump(class_names, f, indent=2)
    print(f"\nClass names saved to: {CLASS_NAMES_PATH}")

    # 13. Compute class weights for imbalanced data
    use_class_weights = not args.no_class_weights
    class_weights = None

    if use_class_weights:
        class_weights = compute_class_weights(train_class_counts, num_classes, strategy="balanced")
        class_weights = class_weights.to(device)
        print("\nClass weights (for handling imbalance):")
        for idx, name in enumerate(class_names):
            print(f"  {name:10s}: {class_weights[idx]:.4f}")
    else:
        print("\nClass weighting disabled (--no-class-weights flag)")

    # 14. Create model
    print("\nBuilding model with MobileNetV3-Small backbone...")
    model = create_model(num_classes=num_classes, pretrained=True)

    # Freeze the feature extractor initially (for transfer learning)
    for param in model.features.parameters():
        param.requires_grad = False

    model = model.to(device)

    # Print model summary
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Total parameters: {total_params:,}")
    print(f"Trainable parameters: {trainable_params:,}")

    # 15. Loss function (with optional class weights) and optimizer
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = optim.Adam(model.classifier.parameters(), lr=LEARNING_RATE)

    # 16. Training history
    history = {
        "train_loss": [],
        "train_acc": [],
        "val_loss": [],
        "val_acc": [],
    }

    best_val_acc = -float('inf')
    best_model_weights = None
    best_epoch = 0

    # Training configuration
    initial_epochs = args.epochs
    fine_tune_epochs = args.fine_tune_epochs
    total_epochs = initial_epochs + fine_tune_epochs

    # 17. Phase 1: Train classifier head only (frozen backbone)
    print("\n" + "=" * 65)
    print("  Phase 1/2: Training with frozen backbone")
    print(f"  Learning rate: {LEARNING_RATE}, Epochs: {initial_epochs}")
    print("=" * 65 + "\n")

    for epoch in range(1, initial_epochs + 1):
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = validate(model, val_loader, criterion, device)

        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)

        print(f"Epoch {epoch:2d}/{initial_epochs} - "
              f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f} - "
              f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}", end="")

        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_epoch = epoch
            best_model_weights = copy.deepcopy(model.state_dict())
            os.makedirs(MODELS_DIR, exist_ok=True)
            torch.save(model.state_dict(), MODEL_SAVE_PATH)
            print(f"  <- best")
        else:
            print()

    # 18. Phase 2: Fine-tuning (unfreeze backbone)
    print("\n" + "=" * 65)
    print("  Phase 2/2: Fine-tuning with unfrozen backbone")
    print(f"  Learning rate: {FINE_TUNE_LR}, Epochs: {fine_tune_epochs}")
    print("=" * 65 + "\n")

    # Unfreeze backbone layers
    for param in model.features.parameters():
        param.requires_grad = True

    # Update trainable params count
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Trainable parameters (fine-tuning): {trainable_params:,}\n")

    # Use lower learning rate for fine-tuning
    optimizer = optim.Adam(model.parameters(), lr=FINE_TUNE_LR)

    fine_tune_start = len(history["train_acc"]) + 1

    for epoch in range(1, fine_tune_epochs + 1):
        actual_epoch = initial_epochs + epoch
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = validate(model, val_loader, criterion, device)

        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)

        print(f"Epoch {actual_epoch:2d}/{total_epochs} - "
              f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f} - "
              f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}", end="")

        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_epoch = actual_epoch
            best_model_weights = copy.deepcopy(model.state_dict())
            torch.save(model.state_dict(), MODEL_SAVE_PATH)
            print(f"  <- best")
        else:
            print()

    # 19. Load best weights for final evaluation
    if best_model_weights is not None:
        model.load_state_dict(best_model_weights)

    # 20. Final evaluation
    print("\n" + "=" * 65)
    print("  TRAINING COMPLETE")
    print("=" * 65 + "\n")

    final_val_loss, final_val_acc = validate(model, val_loader, criterion, device)
    print(f"Final Validation Loss:     {final_val_loss:.4f}")
    print(f"Final Validation Accuracy: {final_val_acc:.4f}")
    print(f"\nBest Validation Accuracy:  {best_val_acc:.4f} (epoch {best_epoch})")
    print(f"\nModel saved to: {MODEL_SAVE_PATH}")
    print(f"Class names saved to: {CLASS_NAMES_PATH}")

    # 21. Save training history plot
    save_training_history(history, HISTORY_PLOT_PATH, fine_tune_start=fine_tune_start)

    # 22. Save training history JSON
    save_training_history_json(history, HISTORY_JSON_PATH)

    # 23. Save comprehensive training report
    training_report = {
        "timestamp": datetime.now().isoformat(),
        "config": {
            "random_seed": RANDOM_SEED,
            "batch_size": BATCH_SIZE,
            "initial_epochs": initial_epochs,
            "fine_tune_epochs": fine_tune_epochs,
            "initial_lr": LEARNING_RATE,
            "fine_tune_lr": FINE_TUNE_LR,
            "validation_split": VALIDATION_SPLIT,
            "use_class_weights": use_class_weights,
            "device": str(device),
        },
        "dataset": {
            "total_samples": total_size,
            "train_samples": len(train_dataset),
            "val_samples": len(val_dataset),
            "class_names": class_names,
            "class_distribution": {class_names[k]: v for k, v in full_class_counts.items()},
        },
        "class_weights": {
            class_names[i]: float(class_weights[i]) for i in range(num_classes)
        } if class_weights is not None else None,
        "results": {
            "best_val_accuracy": best_val_acc,
            "best_epoch": best_epoch,
            "final_val_loss": final_val_loss,
            "final_val_accuracy": final_val_acc,
        },
        "model_path": MODEL_SAVE_PATH,
    }
    os.makedirs(REPORTS_DIR, exist_ok=True)
    save_training_report(training_report, TRAINING_REPORT_PATH)

    print("\nDone! Next steps:")
    print("  1. Evaluate the model:")
    print("     python -m ML.evaluation.evaluate_category_model")
    print("  2. Run inference on a test image:")
    print("     python -m ML.inference.predict_category --image <path_to_image>")


if __name__ == "__main__":
    main()
