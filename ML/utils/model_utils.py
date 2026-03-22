"""
CleanSight ML Phase 2 — Shared Model Utilities (PyTorch)

Centralized helpers used by training, inference, and evaluation scripts.
This module ensures consistency across the Phase 2 pipeline.
"""

import math

import torch
import torch.nn as nn
from torchvision import transforms, models


# ── Configuration ──────────────────────────────────────────────────────────────

IMG_SIZE = 224

# ImageNet normalization values
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


# ── Device Selection ───────────────────────────────────────────────────────────

def get_device():
    """Get the best available device (CUDA, MPS, or CPU)."""
    if torch.cuda.is_available():
        return torch.device("cuda")
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return torch.device("mps")
    else:
        return torch.device("cpu")


# ── Model Architecture ─────────────────────────────────────────────────────────

def create_model(num_classes, pretrained=True):
    """
    Create a MobileNetV3-Small model with a custom classifier head.

    Args:
        num_classes: Number of output classes
        pretrained: Whether to load ImageNet pretrained weights (for training)
                   Set to False when loading saved weights (inference/evaluation)

    Returns:
        PyTorch model with custom classifier head
    """
    weights = models.MobileNet_V3_Small_Weights.IMAGENET1K_V1 if pretrained else None
    model = models.mobilenet_v3_small(weights=weights)

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


# ── Data Transforms ────────────────────────────────────────────────────────────

def get_train_transform():
    """Get the training data transform with augmentation."""
    return transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(15),
        transforms.RandomAffine(degrees=0, translate=(0.1, 0.1), scale=(0.9, 1.1)),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


def get_val_transform():
    """Get the validation/inference data transform (no augmentation)."""
    return transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


def get_data_transforms():
    """Get both training and validation transforms."""
    return get_train_transform(), get_val_transform()


# ── Dataset Split Validation ───────────────────────────────────────────────────

def validate_split_sizes(total_size, validation_split, min_val_samples=1, min_train_samples=1):
    """
    Calculate and validate train/validation split sizes.

    Args:
        total_size: Total number of samples in the dataset
        validation_split: Fraction of data to use for validation (0.0 to 1.0)
        min_val_samples: Minimum required validation samples
        min_train_samples: Minimum required training samples

    Returns:
        Tuple of (train_size, val_size)

    Raises:
        ValueError: If dataset is too small for the configured split or invalid parameters
    """
    # Validate validation_split range
    if not (0.0 < validation_split < 1.0):
        raise ValueError(
            f"validation_split must be between 0.0 and 1.0 (exclusive), got {validation_split}"
        )

    # Use math.ceil to ensure at least min_val_samples in validation set
    val_size = max(min_val_samples, math.ceil(total_size * validation_split))

    # Ensure val_size doesn't exceed total_size
    val_size = min(val_size, total_size - min_train_samples)

    train_size = total_size - val_size

    if train_size < min_train_samples:
        raise ValueError(
            f"Dataset too small for the configured split. "
            f"Total samples: {total_size}, validation split: {validation_split}. "
            f"This would result in {train_size} training samples (minimum: {min_train_samples}) "
            f"and {val_size} validation samples (minimum: {min_val_samples}). "
            f"Please add more images to your dataset or reduce VALIDATION_SPLIT."
        )

    return train_size, val_size
