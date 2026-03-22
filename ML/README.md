# CleanSight ML Module

This directory contains the machine learning components for the CleanSight waste detection system. The ML pipeline is split into two phases:

- **Phase 1** — Binary classification (trash vs. non-trash) — TensorFlow/Keras
- **Phase 2** — Waste category classification (plastic, paper, glass, mixed) — **PyTorch**

In the full pipeline, Phase 1 first determines whether an image contains waste. If it does, Phase 2 classifies the type of waste. Backend integration and admin review flows are handled in separate branches.

> **Note**: Phase 2 was migrated from TensorFlow/Keras to PyTorch for Python 3.14+ compatibility on Windows. See the "Why PyTorch?" section below for details.

---

## Phase 1 — Trash Detection (Binary)

### Dataset Structure

```
ML/dataset_binary/
  trash/          ← images of waste / litter
  non_trash/      ← clean environment images
```

### Training

```bash
python -m ML.training.train_binary_model
```

Trains a MobileNetV2-based binary classifier. The best model is saved to:

```
ML/models/trash_classifier.keras
```

### Inference

```bash
python -m ML.inference.predict_image --image <path_to_image>
```

### Evaluation

```bash
python -m ML.evaluation.evaluate_model
```

### Dataset Check

```bash
python -m ML.utils.check_dataset
```

---

## Phase 2 — Waste Category Classification (PyTorch)

Phase 2 classifies waste images into one of four categories. It is designed to run **after** Phase 1 confirms the image contains trash.

This phase uses **PyTorch** with a **MobileNetV3-Small** backbone for Python 3.14+ compatibility on Windows.

### Dataset Structure

```
ML/dataset_category/
  plastic/        ← plastic waste images
  paper/          ← paper waste images
  glass/          ← glass waste images
  mixed/          ← mixed waste images
```

Each subfolder must contain real images (`.jpg`, `.jpeg`, `.png`, etc.). Do **not** use placeholder or synthetic data.

### Training

```bash
python -m ML.training.train_category_model
```

This script:
- Loads images from `ML/dataset_category/` using `torchvision.datasets.ImageFolder`
- Uses 224×224 image size with 80/20 train/validation split
- Applies data augmentation (random flip, rotation, affine transforms, color jitter)
- Uses MobileNetV3-Small transfer learning (frozen backbone → fine-tuned)
- Saves the best model to `ML/models/waste_category_classifier.pt`
- Saves the class name order to `ML/models/category_class_names.json`
- Saves training history plot to `ML/artifacts/category_training_history.png`

### Inference

```bash
python -m ML.inference.predict_category --image <path_to_image>
```

Options:
| Flag | Default | Description |
|------|---------|-------------|
| `--image` | *(required)* | Path to the image to classify |
| `--model` | `ML/models/waste_category_classifier.pt` | Path to model file |
| `--labels` | `ML/models/category_class_names.json` | Path to class names JSON |

The script outputs the predicted category, confidence score, and per-class probabilities.

### Evaluation

```bash
python -m ML.evaluation.evaluate_category_model
```

Reports accuracy, precision, recall, F1-score (per class), and saves:
- Confusion matrix plot: `ML/artifacts/category_confusion_matrix.png`
- Evaluation report JSON: `ML/artifacts/category_evaluation_report.json`

### Dataset Check

```bash
python -m ML.utils.check_category_dataset
```

Scans the category dataset folders, counts images per class, reports distribution, and detects invalid or corrupted files.

---

## Model Artifacts

| File | Description |
|------|-------------|
| `models/trash_classifier.keras` | Phase 1 binary model (TensorFlow) |
| `models/waste_category_classifier.pt` | Phase 2 category model (PyTorch) |
| `models/category_class_names.json` | Phase 2 class name order (saved during training) |
| `artifacts/category_training_history.png` | Phase 2 training accuracy/loss plot |
| `artifacts/category_confusion_matrix.png` | Phase 2 evaluation confusion matrix |
| `artifacts/category_evaluation_report.json` | Phase 2 evaluation metrics report |

All model files and artifacts are git-ignored.

---

## How Phase 1 and Phase 2 Work Together

```
    Image Input
         │
    ┌────▼────┐
    │ Phase 1 │  → trash or non-trash? (TensorFlow)
    └────┬────┘
         │ (trash confirmed)
    ┌────▼────┐
    │ Phase 2 │  → plastic / paper / glass / mixed (PyTorch)
    └─────────┘
```

A future integration branch will combine both phases into a single prediction flow and connect them to the backend API.

---

## Setup and Installation

### Prerequisites

- **Python 3.14+** (tested on Python 3.14.3 on Windows)
- Windows PowerShell or Command Prompt

### Step 1: Create a Python Virtual Environment

Navigate to your project root directory:

```powershell
cd C:\path\to\CleanSight
```

Create a virtual environment:

```powershell
python -m venv venv
```

### Step 2: Activate the Virtual Environment

On Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

On Windows Command Prompt:

```cmd
venv\Scripts\activate.bat
```

You should see `(venv)` prefix in your terminal prompt indicating the virtual environment is active.

### Step 3: Install ML Dependencies

With the virtual environment activated, install all required packages:

```powershell
pip install -r ML/requirements.txt
```

This will install:
- `torch` — PyTorch deep learning framework
- `torchvision` — Computer vision models and transforms
- `Pillow` — Image processing
- `numpy` — Numerical computing
- `matplotlib` — Plotting and visualization
- `seaborn` — Statistical visualization
- `scikit-learn` — Machine learning metrics

**Note for CPU-only installation** (if you don't have a CUDA GPU):

```powershell
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r ML/requirements.txt
```

### Step 4: Verify PyTorch Installation

Test that PyTorch is correctly installed:

```powershell
python -c "import torch; print('PyTorch version:', torch.__version__); print('CUDA available:', torch.cuda.is_available())"
```

Expected output (example):

```
PyTorch version: 2.5.0
CUDA available: False
```

(CUDA will be `True` if you have a compatible NVIDIA GPU with drivers installed)

---

## Common Issues and Solutions

### Issue: "ModuleNotFoundError: No module named 'torch'"

**Cause**: PyTorch is not installed in the active environment.

**Solution**:
1. Verify your virtual environment is activated (check for `(venv)` prefix)
2. Install dependencies: `pip install -r ML/requirements.txt`
3. If the issue persists, install PyTorch directly: `pip install torch torchvision`

### Issue: "ModuleNotFoundError: No module named 'seaborn'"

**Cause**: seaborn is not installed in the active environment.

**Solution**:
1. Verify your virtual environment is activated
2. Install seaborn: `pip install seaborn`
3. Or reinstall all dependencies: `pip install -r ML/requirements.txt`

### Issue: Virtual environment activation fails (PowerShell)

**Cause**: PowerShell execution policy restriction.

**Solution**:
Run PowerShell as Administrator and execute:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try activating again: `.\venv\Scripts\Activate.ps1`

### Issue: Python command not found

**Cause**: Python is not in your system PATH.

**Solution**:
1. Reinstall Python and check "Add Python to PATH" during installation
2. Or use the full path to python.exe: `C:\Python314\python.exe -m venv venv`

### Issue: "pip install -r ML/requirements.txt" fails with encoding error

**Cause**: The requirements.txt file may be encoded incorrectly (UTF-16 instead of UTF-8).

**Solution**:
1. Check file encoding in VS Code (bottom-right status bar should show "UTF-8")
2. If it shows UTF-16, click encoding → "Save with Encoding" → UTF-8
3. Retry installation: `pip install -r ML/requirements.txt`

### Issue: CUDA out of memory during training

**Cause**: GPU memory is insufficient for the batch size.

**Solution**:
1. Reduce `BATCH_SIZE` in the training script (try 16 or 8)
2. Or train on CPU by ensuring CUDA is not available
3. Close other GPU-intensive applications

---

## Running ML Scripts

Always ensure your virtual environment is activated before running scripts. From the project root:

**Check datasets:**
```powershell
python -m ML.utils.check_dataset          # Phase 1 dataset
python -m ML.utils.check_category_dataset  # Phase 2 dataset
```

**Train models:**
```powershell
python -m ML.training.train_binary_model    # Phase 1 training (TensorFlow)
python -m ML.training.train_category_model  # Phase 2 training (PyTorch)
```

**Run inference:**
```powershell
python -m ML.inference.predict_image --image path/to/image.jpg           # Phase 1
python -m ML.inference.predict_category --image path/to/image.jpg        # Phase 2
```

**Evaluate models:**
```powershell
python -m ML.evaluation.evaluate_model          # Phase 1 evaluation
python -m ML.evaluation.evaluate_category_model # Phase 2 evaluation
```

---

## Why PyTorch for Phase 2?

Phase 2 was migrated from TensorFlow/Keras to PyTorch for the following reasons:

1. **Python 3.14+ Compatibility**: TensorFlow 2.x does not yet officially support Python 3.14. PyTorch has better forward compatibility with newer Python versions on Windows.

2. **Simpler Windows Installation**: PyTorch installation on Windows is more straightforward, especially for students who may not have complex build environments.

3. **Lightweight Model**: MobileNetV3-Small was chosen over MobileNetV2 as it offers better accuracy-to-efficiency ratio and is well-suited for student laptops.

4. **Transfer Learning Support**: PyTorch's `torchvision.models` provides excellent pretrained models with modern weight APIs.

5. **Educational Value**: PyTorch's explicit training loop helps students understand the training process better than Keras's high-level `model.fit()`.

**Note**: Phase 1 remains on TensorFlow/Keras. A future integration branch may unify both phases under a single framework if needed.

---

## Future Branches

The following features are planned for later branches (not included here):

- Phase 1 migration to PyTorch (if needed for unified framework)
- Phase 2 backend integration
- Phase 2 admin review flow
- Combined Phase 1 → Phase 2 prediction endpoint
