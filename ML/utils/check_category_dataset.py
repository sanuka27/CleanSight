"""
CleanSight ML Phase 2 — Category Dataset Checker

Scans the Phase 2 dataset folder (ML/dataset_category/) and reports:
- Number of images per class
- Class distribution
- Invalid or corrupted files

Usage (from project root):
    python -m ML.utils.check_category_dataset
"""

import os
import sys
from PIL import Image

# Paths (relative to project root)
ML_DIR = os.path.join(os.path.dirname(__file__), os.pardir)
ML_DIR = os.path.abspath(ML_DIR)

DATASET_DIR = os.path.join(ML_DIR, "dataset_category")
EXPECTED_CLASSES = ["glass", "mixed", "paper", "plastic"]
VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp"}


def check_category_dataset(dataset_dir=None):
    """Scan the category dataset and report statistics."""
    if dataset_dir is None:
        dataset_dir = DATASET_DIR

    print("=" * 55)
    print("  CleanSight Phase 2 — Category Dataset Check")
    print("=" * 55)
    print(f"\nDataset path: {dataset_dir}\n")

    # Check if the dataset directory exists
    if not os.path.isdir(dataset_dir):
        print(f"ERROR: Dataset directory not found: {dataset_dir}")
        print("Please create the directory with subfolders: plastic, paper, glass, mixed")
        sys.exit(1)

    # Find class subdirectories
    found_dirs = sorted([
        d for d in os.listdir(dataset_dir)
        if os.path.isdir(os.path.join(dataset_dir, d))
    ])

    if not found_dirs:
        print("ERROR: No class subdirectories found.")
        print(f"Expected subfolders: {EXPECTED_CLASSES}")
        sys.exit(1)

    # Check for missing expected classes
    missing = [c for c in EXPECTED_CLASSES if c not in found_dirs]
    if missing:
        print(f"WARNING: Missing expected class folders: {missing}")

    unexpected = [c for c in found_dirs if c not in EXPECTED_CLASSES]
    if unexpected:
        print(f"WARNING: Unexpected class folders found: {unexpected}")

    print(f"Found class folders: {found_dirs}\n")

    # Scan each class
    total_valid = 0
    total_invalid = 0
    class_counts = {}

    for cls in found_dirs:
        cls_path = os.path.join(dataset_dir, cls)
        valid_count = 0
        invalid_count = 0
        invalid_files = []

        files = [f for f in os.listdir(cls_path) if os.path.isfile(os.path.join(cls_path, f))]

        for filename in files:
            filepath = os.path.join(cls_path, filename)
            ext = os.path.splitext(filename)[1].lower()

            # Check extension
            if ext not in VALID_EXTENSIONS:
                invalid_count += 1
                invalid_files.append(f"{filename} (unsupported extension: {ext})")
                continue

            # Try to open with PIL to detect corruption
            try:
                with Image.open(filepath) as img:
                    img.verify()
                valid_count += 1
            except Exception as e:
                invalid_count += 1
                invalid_files.append(f"{filename} (corrupted: {e})")

        class_counts[cls] = valid_count
        total_valid += valid_count
        total_invalid += invalid_count

        print(f"Class '{cls}':")
        print(f"  Valid images:   {valid_count}")
        print(f"  Invalid files:  {invalid_count}")
        if invalid_files:
            for inv in invalid_files[:5]:  # Show at most 5 invalid files
                print(f"    ✗ {inv}")
            if len(invalid_files) > 5:
                print(f"    ... and {len(invalid_files) - 5} more")
        print("")

    # Summary
    print("-" * 55)
    print(f"Total valid images:   {total_valid}")
    print(f"Total invalid files:  {total_invalid}")

    if total_valid > 0:
        print("\nClass distribution:")
        for cls, count in class_counts.items():
            pct = count / total_valid * 100
            bar = "█" * int(pct / 2)
            print(f"  {cls:10s}  {count:5d}  ({pct:5.1f}%)  {bar}")
    else:
        print("\nWARNING: No valid images found. Cannot train the model.")
        print("Add real images to each class subfolder before training.")

    print("")
    return class_counts


if __name__ == "__main__":
    check_category_dataset()
