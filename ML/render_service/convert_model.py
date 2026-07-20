"""
Convert trash_classifier.keras to trash_classifier.h5

Run this once from the CleanSight project root with the ML venv active:

    cd CleanSight
    ML/venv/Scripts/Activate.ps1
    python ML/render_service/convert_model.py
"""

import sys
from pathlib import Path

# Ensure ML package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import tensorflow as tf

SRC = Path(__file__).resolve().parent.parent / "models" / "trash_classifier.keras"
DST = Path(__file__).resolve().parent.parent / "models" / "trash_classifier.h5"

print(f"Loading  : {SRC}")
model = tf.keras.models.load_model(str(SRC), compile=False)

print(f"Saving   : {DST}")
model.save(str(DST))

print("Done. Verify with a quick predict to make sure weights are intact.")
print(f"File size: {DST.stat().st_size / 1024 / 1024:.1f} MB")
