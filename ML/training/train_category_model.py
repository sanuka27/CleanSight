"""
CleanSight ML Phase 2 — Waste Category Classification Training Pipeline (PyTorch)

Trains a MobileNetV3-Small-based multi-class classifier to categorize waste images
into: plastic, paper, glass, or mixed.

This implementation uses PyTorch for Python 3.14.3 compatibility on Windows.

Usage (from project root):
    python -m ML.training.train_category_model

Requirements:
    - Real images must be present in ML/dataset_category/{plastic,paper,glass,mixed}/
    - PyTorch, torchvision, matplotlib, numpy, scikit-learn
"""

import os
import sys
import json
import copy

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms, models

# ── Configuration ──────────────────────────────────────────────────────────────

IMG_SIZE = 224
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

MODEL_SAVE_PATH = os.path.join(MODELS_DIR, "waste_category_classifier.pt")
CLASS_NAMES_PATH = os.path.join(MODELS_DIR, "category_class_names.json")
HISTORY_PLOT_PATH = os.path.join(ARTIFACTS_DIR, "category_training_history.png")

EXPECTED_CLASSES = ["glass", "mixed", "paper", "plastic"]


# ── Helpers ────────────────────────────────────────────────────────────────────

def get_device():
    """Get the best available device (CUDA, MPS, or CPU)."""
    if torch.cuda.is_available():
        return torch.device("cuda")
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return torch.device("mps")
    else:
        return torch.device("cpu")


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
        print(f"WARNING: Unexpected class folders found (will be ignored by training): {unexpected}")

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


def get_data_transforms():
    """Get training and validation data transforms."""
    # ImageNet normalization values
    mean = [0.485, 0.456, 0.406]
    std = [0.229, 0.224, 0.225]

    train_transform = transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(15),
        transforms.RandomAffine(degrees=0, translate=(0.1, 0.1), scale=(0.9, 1.1)),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=mean, std=std),
    ])

    val_transform = transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=mean, std=std),
    ])

    return train_transform, val_transform


def create_model(num_classes, pretrained=True):
    """Create a MobileNetV3-Small model with a custom classifier head."""
    # Use MobileNetV3-Small - lightweight and fast for student laptops
    weights = models.MobileNet_V3_Small_Weights.IMAGENET1K_V1 if pretrained else None
    model = models.mobilenet_v3_small(weights=weights)

    # Freeze the feature extractor initially
    for param in model.features.parameters():
        param.requires_grad = False

    # Replace the classifier head
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

    ax1.plot(epochs_range, history["train_acc"], label="Train Accuracy")
    ax1.plot(epochs_range, history["val_acc"], label="Val Accuracy")
    if fine_tune_start:
        ax1.axvline(x=fine_tune_start, color="gray", linestyle="--", label="Fine-Tune Start")
    ax1.set_title("Category Model - Accuracy")
    ax1.set_xlabel("Epoch")
    ax1.set_ylabel("Accuracy")
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    ax2.plot(epochs_range, history["train_loss"], label="Train Loss")
    ax2.plot(epochs_range, history["val_loss"], label="Val Loss")
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


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  CleanSight Phase 2 - Waste Category Classifier Training")
    print("  (PyTorch Implementation)")
    print("=" * 60 + "\n")

    # 1. Validate dataset
    found_classes = validate_dataset_dir(DATASET_DIR)

    # 2. Get device
    device = get_device()
    print(f"\nUsing device: {device}")

    # 3. Prepare data transforms
    train_transform, val_transform = get_data_transforms()

    # 4. Load full dataset and split
    print("\nLoading dataset...")
    full_dataset = datasets.ImageFolder(DATASET_DIR)
    class_names = full_dataset.classes
    num_classes = len(class_names)

    print(f"Class names: {class_names}")
    print(f"Number of classes: {num_classes}")
    print(f"Total images: {len(full_dataset)}")

    # Calculate split sizes
    total_size = len(full_dataset)
    val_size = int(total_size * VALIDATION_SPLIT)
    train_size = total_size - val_size

    # Split dataset with fixed seed for reproducibility
    generator = torch.Generator().manual_seed(42)
    train_indices, val_indices = random_split(
        range(total_size), [train_size, val_size], generator=generator
    )

    # Create datasets with appropriate transforms
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

    # Need to reload without transform for subset creation
    full_dataset_raw = datasets.ImageFolder(DATASET_DIR)
    train_dataset = TransformedSubset(full_dataset_raw, train_indices.indices, train_transform)
    val_dataset = TransformedSubset(full_dataset_raw, val_indices.indices, val_transform)

    print(f"Training samples: {len(train_dataset)}")
    print(f"Validation samples: {len(val_dataset)}")

    # 5. Create data loaders
    train_loader = DataLoader(
        train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=NUM_WORKERS
    )
    val_loader = DataLoader(
        val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=NUM_WORKERS
    )

    # 6. Save class names for reuse in inference and evaluation
    os.makedirs(MODELS_DIR, exist_ok=True)
    with open(CLASS_NAMES_PATH, "w", encoding="utf-8") as f:
        json.dump(class_names, f, indent=2)
    print(f"Class names saved to: {CLASS_NAMES_PATH}")

    # 7. Create model
    print("\nBuilding model with MobileNetV3-Small backbone...")
    model = create_model(num_classes=num_classes, pretrained=True)
    model = model.to(device)

    # Print model summary
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Total parameters: {total_params:,}")
    print(f"Trainable parameters: {trainable_params:,}")

    # 8. Loss function and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.classifier.parameters(), lr=LEARNING_RATE)

    # 9. Training history
    history = {
        "train_loss": [],
        "train_acc": [],
        "val_loss": [],
        "val_acc": [],
    }

    best_val_acc = 0.0
    best_model_weights = None

    # 10. Phase 1: Train classifier head only (frozen backbone)
    print("\n" + "=" * 60)
    print("  Phase 1/2: Training with frozen backbone")
    print("=" * 60 + "\n")

    for epoch in range(1, INITIAL_EPOCHS + 1):
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = validate(model, val_loader, criterion, device)

        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)

        print(f"Epoch {epoch:2d}/{INITIAL_EPOCHS} - "
              f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f} - "
              f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}")

        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_model_weights = copy.deepcopy(model.state_dict())
            torch.save(model.state_dict(), MODEL_SAVE_PATH)
            print(f"  -> New best model saved (val_acc: {val_acc:.4f})")

    # 11. Phase 2: Fine-tuning (unfreeze backbone)
    print("\n" + "=" * 60)
    print("  Phase 2/2: Fine-tuning with unfrozen backbone")
    print("=" * 60 + "\n")

    # Unfreeze backbone layers
    for param in model.features.parameters():
        param.requires_grad = True

    # Use lower learning rate for fine-tuning
    optimizer = optim.Adam(model.parameters(), lr=FINE_TUNE_LR)

    fine_tune_start = len(history["train_acc"]) + 1

    for epoch in range(1, FINE_TUNE_EPOCHS + 1):
        actual_epoch = INITIAL_EPOCHS + epoch
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = validate(model, val_loader, criterion, device)

        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)

        print(f"Epoch {actual_epoch:2d}/{INITIAL_EPOCHS + FINE_TUNE_EPOCHS} - "
              f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f} - "
              f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}")

        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_model_weights = copy.deepcopy(model.state_dict())
            torch.save(model.state_dict(), MODEL_SAVE_PATH)
            print(f"  -> New best model saved (val_acc: {val_acc:.4f})")

    # 12. Load best weights for final evaluation
    if best_model_weights is not None:
        model.load_state_dict(best_model_weights)

    # 13. Final evaluation
    print("\n" + "=" * 60)
    print("  TRAINING COMPLETE")
    print("=" * 60 + "\n")

    final_val_loss, final_val_acc = validate(model, val_loader, criterion, device)
    print(f"Final Validation Loss:     {final_val_loss:.4f}")
    print(f"Final Validation Accuracy: {final_val_acc:.4f}")
    print(f"\nBest Validation Accuracy:  {best_val_acc:.4f}")
    print(f"\nModel saved to: {MODEL_SAVE_PATH}")
    print(f"Class names saved to: {CLASS_NAMES_PATH}")

    # 14. Save training history plot
    save_training_history(history, HISTORY_PLOT_PATH, fine_tune_start=fine_tune_start)

    print("\nDone! You can now run inference with:")
    print("  python -m ML.inference.predict_category --image <path_to_image>")


if __name__ == "__main__":
    main()
