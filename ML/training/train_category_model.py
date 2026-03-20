"""
CleanSight ML Phase 2 — Waste Category Classification Training Pipeline

Trains a MobileNetV2-based multi-class classifier to categorize waste images
into: plastic, paper, glass, or mixed.

Usage (from project root):
    python -m ML.training.train_category_model

Requirements:
    - Real images must be present in ML/dataset_category/{plastic,paper,glass,mixed}/
    - TensorFlow 2.x, matplotlib, numpy
"""

import os
import sys
import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.layers import (
    Dense,
    Dropout,
    GlobalAveragePooling2D,
    RandomFlip,
    RandomRotation,
    RandomZoom,
    RandomContrast,
)
from tensorflow.keras.models import Model
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping

# ── Configuration ──────────────────────────────────────────────────────────────

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
INITIAL_EPOCHS = 15
FINE_TUNE_EPOCHS = 10
VALIDATION_SPLIT = 0.2
FINE_TUNE_AT_LAYER = -30  # Unfreeze the last 30 layers during fine-tuning

# Paths (relative to project root)
ML_DIR = os.path.join(os.path.dirname(__file__), os.pardir)
ML_DIR = os.path.abspath(ML_DIR)

DATASET_DIR = os.path.join(ML_DIR, "dataset_category")
MODELS_DIR = os.path.join(ML_DIR, "models")
ARTIFACTS_DIR = os.path.join(ML_DIR, "artifacts")

MODEL_SAVE_PATH = os.path.join(MODELS_DIR, "waste_category_classifier.keras")
CLASS_NAMES_PATH = os.path.join(MODELS_DIR, "category_class_names.json")
HISTORY_PLOT_PATH = os.path.join(ARTIFACTS_DIR, "category_training_history.png")

EXPECTED_CLASSES = ["glass", "mixed", "paper", "plastic"]


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


def build_data_augmentation():
    """Build a sequential data augmentation layer."""
    return tf.keras.Sequential([
        RandomFlip("horizontal"),
        RandomRotation(0.15),
        RandomZoom(0.15),
        RandomContrast(0.1),
    ], name="data_augmentation")


def save_training_history(history, fine_tune_history, save_path):
    """Save training accuracy and loss plots."""
    os.makedirs(os.path.dirname(save_path), exist_ok=True)

    # Copy lists to avoid mutating history.history in place
    acc = list(history.history["accuracy"])
    val_acc = list(history.history["val_accuracy"])
    loss = list(history.history["loss"])
    val_loss = list(history.history["val_loss"])

    # Record the initial epoch count before appending fine-tune data
    initial_epochs = len(acc)

    if fine_tune_history:
        acc += fine_tune_history.history["accuracy"]
        val_acc += fine_tune_history.history["val_accuracy"]
        loss += fine_tune_history.history["loss"]
        val_loss += fine_tune_history.history["val_loss"]

    epochs_range = range(1, len(acc) + 1)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    ax1.plot(epochs_range, acc, label="Train Accuracy")
    ax1.plot(epochs_range, val_acc, label="Val Accuracy")
    if fine_tune_history:
        ax1.axvline(x=initial_epochs, color="gray", linestyle="--", label="Fine-Tune Start")
    ax1.set_title("Category Model — Accuracy")
    ax1.set_xlabel("Epoch")
    ax1.set_ylabel("Accuracy")
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    ax2.plot(epochs_range, loss, label="Train Loss")
    ax2.plot(epochs_range, val_loss, label="Val Loss")
    if fine_tune_history:
        ax2.axvline(x=initial_epochs, color="gray", linestyle="--", label="Fine-Tune Start")
    ax2.set_title("Category Model — Loss")
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
    print("  CleanSight Phase 2 — Waste Category Classifier Training")
    print("=" * 60 + "\n")

    # 1. Validate dataset
    found_classes = validate_dataset_dir(DATASET_DIR)

    # 2. Load datasets
    print("\nLoading training dataset...")
    train_ds = tf.keras.utils.image_dataset_from_directory(
        DATASET_DIR,
        validation_split=VALIDATION_SPLIT,
        subset="training",
        seed=42,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="categorical",
    )

    print("Loading validation dataset...")
    val_ds = tf.keras.utils.image_dataset_from_directory(
        DATASET_DIR,
        validation_split=VALIDATION_SPLIT,
        subset="validation",
        seed=42,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="categorical",
    )

    # Capture class names from the dataset (guaranteed consistent order)
    class_names = train_ds.class_names
    num_classes = len(class_names)
    print(f"\nClass names: {class_names}")
    print(f"Number of classes: {num_classes}")

    # Save class names for reuse in inference and evaluation
    os.makedirs(MODELS_DIR, exist_ok=True)
    with open(CLASS_NAMES_PATH, "w", encoding="utf-8") as f:
        json.dump(class_names, f, indent=2)
    print(f"Class names saved to: {CLASS_NAMES_PATH}")

    # 3. Performance optimization
    AUTOTUNE = tf.data.AUTOTUNE
    train_ds = train_ds.prefetch(buffer_size=AUTOTUNE)
    val_ds = val_ds.prefetch(buffer_size=AUTOTUNE)

    # 4. Data augmentation
    data_augmentation = build_data_augmentation()

    # 5. Build model
    print("\nBuilding model with MobileNetV2 backbone...")
    base_model = MobileNetV2(
        input_shape=IMG_SIZE + (3,),
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = False  # Freeze base model initially

    inputs = tf.keras.Input(shape=IMG_SIZE + (3,))
    x = data_augmentation(inputs)
    x = preprocess_input(x)
    x = base_model(x, training=False)
    x = GlobalAveragePooling2D()(x)
    x = Dropout(0.3)(x)
    x = Dense(128, activation="relu")(x)
    x = Dropout(0.2)(x)
    outputs = Dense(num_classes, activation="softmax")(x)

    model = Model(inputs, outputs)

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    model.summary()

    # 6. Callbacks
    os.makedirs(MODELS_DIR, exist_ok=True)
    callbacks = [
        ModelCheckpoint(
            MODEL_SAVE_PATH,
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),
        EarlyStopping(
            monitor="val_loss",
            patience=5,
            restore_best_weights=True,
            verbose=1,
        ),
    ]

    # 7. Initial training (frozen base)
    print("\n" + "=" * 60)
    print("  Phase 1/2: Training with frozen base model")
    print("=" * 60 + "\n")

    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=INITIAL_EPOCHS,
        callbacks=callbacks,
    )

    # 8. Fine-tuning (unfreeze last N layers)
    print("\n" + "=" * 60)
    print("  Phase 2/2: Fine-tuning with unfrozen top layers")
    print("=" * 60 + "\n")

    base_model.trainable = True
    for layer in base_model.layers[:FINE_TUNE_AT_LAYER]:
        layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    fine_tune_callbacks = [
        ModelCheckpoint(
            MODEL_SAVE_PATH,
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),
        EarlyStopping(
            monitor="val_loss",
            patience=3,
            restore_best_weights=True,
            verbose=1,
        ),
    ]

    fine_tune_history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=INITIAL_EPOCHS + FINE_TUNE_EPOCHS,
        initial_epoch=history.epoch[-1] + 1,
        callbacks=fine_tune_callbacks,
    )

    # 9. Final evaluation
    print("\n" + "=" * 60)
    print("  TRAINING COMPLETE")
    print("=" * 60 + "\n")

    val_loss, val_acc = model.evaluate(val_ds)
    print(f"\nFinal Validation Loss:     {val_loss:.4f}")
    print(f"Final Validation Accuracy: {val_acc:.4f}")
    print(f"\nModel saved to: {MODEL_SAVE_PATH}")
    print(f"Class names saved to: {CLASS_NAMES_PATH}")

    # 10. Save training history plot
    save_training_history(history, fine_tune_history, HISTORY_PLOT_PATH)

    print("\nDone! You can now run inference with:")
    print("  python -m ML.inference.predict_category --image <path_to_image>")


if __name__ == "__main__":
    main()
