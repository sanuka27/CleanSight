"""
CleanSight ML Phase 2 — Category Dataset Checker

Scans the Phase 2 dataset folder (ML/dataset_category/) and reports:
- Number of images per class
- Class distribution with percentages
- Class imbalance warnings and analysis
- Invalid or corrupted files
- Minimum sample recommendations

Usage (from project root):
    python -m ML.utils.check_category_dataset

Options:
    --save-report    Save a JSON summary report to ML/reports/
"""

import os
import sys
import json
import argparse
from datetime import datetime

# Check for required dependencies before importing
try:
    from PIL import Image
except ImportError as e:
    print("\n" + "=" * 70)
    print("  ERROR: Missing required dependencies")
    print("=" * 70)
    print(f"\nFailed to import: {e}")
    print("\nThis script requires Pillow (PIL) to run.")
    print("\nTo fix this issue:")
    print("  1. Ensure your Python virtual environment is activated")
    print("     Windows PowerShell: .\\venv\\Scripts\\Activate.ps1")
    print("     Windows CMD:        venv\\Scripts\\activate.bat")
    print("  2. Install dependencies:")
    print("     pip install -r ML/requirements.txt")
    print("\nFor more help, see ML/README.md - Setup and Installation section")
    print("=" * 70 + "\n")
    sys.exit(1)

# Paths (relative to project root)
ML_DIR = os.path.join(os.path.dirname(__file__), os.pardir)
ML_DIR = os.path.abspath(ML_DIR)

DATASET_DIR = os.path.join(ML_DIR, "dataset_category")
REPORTS_DIR = os.path.join(ML_DIR, "reports")
EXPECTED_CLASSES = ["glass", "mixed", "paper", "plastic"]
VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp"}

# Thresholds for warnings
MIN_SAMPLES_WARNING = 100  # Warn if any class has fewer than this
IMBALANCE_RATIO_WARNING = 3.0  # Warn if max/min ratio exceeds this
SEVERE_IMBALANCE_RATIO = 5.0  # Severe imbalance threshold


def calculate_imbalance_metrics(class_counts):
    """
    Calculate class imbalance metrics.

    Returns:
        dict with imbalance_ratio, smallest_class, largest_class, recommendations
    """
    if not class_counts or len(class_counts) == 0:
        return None

    counts = list(class_counts.values())
    min_count = min(counts)
    max_count = max(counts)
    total = sum(counts)

    if min_count == 0:
        imbalance_ratio = float('inf')
    else:
        imbalance_ratio = max_count / min_count

    # Find smallest and largest classes
    smallest_class = min(class_counts, key=class_counts.get)
    largest_class = max(class_counts, key=class_counts.get)

    # Calculate ideal balanced count
    avg_count = total / len(class_counts)

    # Identify underrepresented classes
    underrepresented = {
        cls: count for cls, count in class_counts.items()
        if count < avg_count * 0.5  # Less than 50% of average
    }

    # Generate recommendations
    recommendations = []

    if imbalance_ratio >= SEVERE_IMBALANCE_RATIO:
        recommendations.append(
            f"SEVERE imbalance detected (ratio {imbalance_ratio:.1f}:1). "
            f"Strongly recommend using class weights or weighted sampling during training."
        )
    elif imbalance_ratio >= IMBALANCE_RATIO_WARNING:
        recommendations.append(
            f"Moderate imbalance detected (ratio {imbalance_ratio:.1f}:1). "
            f"Consider using class weights to improve minority class performance."
        )

    if underrepresented:
        for cls, count in underrepresented.items():
            recommendations.append(
                f"Class '{cls}' is underrepresented ({count} samples, {count/total*100:.1f}% of data). "
                f"Consider adding more samples or applying targeted augmentation."
            )

    for cls, count in class_counts.items():
        if count < MIN_SAMPLES_WARNING:
            recommendations.append(
                f"Class '{cls}' has only {count} samples. "
                f"Recommend at least {MIN_SAMPLES_WARNING} samples for reliable training."
            )

    return {
        "imbalance_ratio": imbalance_ratio,
        "smallest_class": smallest_class,
        "smallest_count": min_count,
        "largest_class": largest_class,
        "largest_count": max_count,
        "average_count": avg_count,
        "underrepresented_classes": underrepresented,
        "recommendations": recommendations,
    }


def check_category_dataset(dataset_dir=None, save_report=False):
    """
    Scan the category dataset and report statistics.

    Args:
        dataset_dir: Path to dataset directory (default: ML/dataset_category)
        save_report: If True, save a JSON summary report

    Returns:
        dict with class_counts, total_valid, total_invalid, imbalance_metrics
    """
    if dataset_dir is None:
        dataset_dir = DATASET_DIR

    print("=" * 65)
    print("  CleanSight Phase 2 — Category Dataset Validation")
    print("=" * 65)
    print(f"\nDataset path: {dataset_dir}")
    print(f"Expected classes: {EXPECTED_CLASSES}\n")

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
        print("  These will be included as additional classes by ImageFolder.")

    print(f"Found class folders: {found_dirs}\n")
    print("-" * 65)

    # Scan each class
    total_valid = 0
    total_invalid = 0
    class_counts = {}
    invalid_files_by_class = {}

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
        invalid_files_by_class[cls] = invalid_files

        # Print class summary
        status = "OK" if valid_count >= MIN_SAMPLES_WARNING else "LOW"
        print(f"  {cls:12s}  {valid_count:5d} images  [{status}]")
        if invalid_count > 0:
            print(f"               {invalid_count:5d} invalid files")
            for inv in invalid_files[:3]:  # Show at most 3 invalid files
                print(f"                 - {inv}")
            if len(invalid_files) > 3:
                print(f"                 ... and {len(invalid_files) - 3} more")

    print("-" * 65)
    print(f"\n  Total valid images:   {total_valid}")
    print(f"  Total invalid files:  {total_invalid}")

    # Class distribution visualization
    if total_valid > 0:
        print("\n" + "=" * 65)
        print("  Class Distribution")
        print("=" * 65 + "\n")

        max_count = max(class_counts.values())
        for cls in EXPECTED_CLASSES:
            if cls in class_counts:
                count = class_counts[cls]
                pct = count / total_valid * 100
                bar_len = int(count / max_count * 35)
                bar = "█" * bar_len
                print(f"  {cls:10s}  {count:5d}  ({pct:5.1f}%)  {bar}")

        # Show any unexpected classes too
        for cls in found_dirs:
            if cls not in EXPECTED_CLASSES:
                count = class_counts[cls]
                pct = count / total_valid * 100
                bar_len = int(count / max_count * 35)
                bar = "█" * bar_len
                print(f"  {cls:10s}  {count:5d}  ({pct:5.1f}%)  {bar}  [unexpected]")
    else:
        print("\nWARNING: No valid images found. Cannot train the model.")
        print("Add real images to each class subfolder before training.")
        return {"class_counts": {}, "total_valid": 0, "total_invalid": total_invalid}

    # Calculate and display imbalance metrics
    imbalance = calculate_imbalance_metrics(class_counts)

    print("\n" + "=" * 65)
    print("  Imbalance Analysis")
    print("=" * 65 + "\n")

    if imbalance:
        print(f"  Imbalance ratio:     {imbalance['imbalance_ratio']:.2f}:1")
        print(f"  Smallest class:      {imbalance['smallest_class']} ({imbalance['smallest_count']} samples)")
        print(f"  Largest class:       {imbalance['largest_class']} ({imbalance['largest_count']} samples)")
        print(f"  Average per class:   {imbalance['average_count']:.0f} samples")

        if imbalance['recommendations']:
            print("\n  Recommendations:")
            for i, rec in enumerate(imbalance['recommendations'], 1):
                # Word wrap long recommendations
                words = rec.split()
                lines = []
                current_line = []
                for word in words:
                    if len(' '.join(current_line + [word])) > 55:
                        lines.append(' '.join(current_line))
                        current_line = [word]
                    else:
                        current_line.append(word)
                if current_line:
                    lines.append(' '.join(current_line))

                print(f"    {i}. {lines[0]}")
                for line in lines[1:]:
                    print(f"       {line}")
        else:
            print("\n  Dataset balance is acceptable for training.")

    print("\n" + "=" * 65)

    # Save report if requested
    if save_report:
        os.makedirs(REPORTS_DIR, exist_ok=True)
        report_path = os.path.join(REPORTS_DIR, "category_dataset_report.json")

        report = {
            "timestamp": datetime.now().isoformat(),
            "dataset_path": dataset_dir,
            "expected_classes": EXPECTED_CLASSES,
            "found_classes": found_dirs,
            "class_counts": class_counts,
            "total_valid": total_valid,
            "total_invalid": total_invalid,
            "imbalance_metrics": {
                "imbalance_ratio": imbalance['imbalance_ratio'] if imbalance else None,
                "smallest_class": imbalance['smallest_class'] if imbalance else None,
                "largest_class": imbalance['largest_class'] if imbalance else None,
                "recommendations": imbalance['recommendations'] if imbalance else [],
            },
            "invalid_files_by_class": {
                cls: files[:10] for cls, files in invalid_files_by_class.items() if files
            },  # Limit to first 10 per class
        }

        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        print(f"\n  Report saved to: {report_path}")

    print("")

    return {
        "class_counts": class_counts,
        "total_valid": total_valid,
        "total_invalid": total_invalid,
        "imbalance_metrics": imbalance,
    }


def main():
    parser = argparse.ArgumentParser(
        description="CleanSight Phase 2 - Validate category dataset"
    )
    parser.add_argument(
        "--dataset", type=str, default=None,
        help="Path to the dataset directory (default: ML/dataset_category)"
    )
    parser.add_argument(
        "--save-report", action="store_true",
        help="Save a JSON summary report to ML/reports/"
    )
    args = parser.parse_args()

    check_category_dataset(
        dataset_dir=args.dataset,
        save_report=args.save_report,
    )


if __name__ == "__main__":
    main()
