# CleanSight ML Module

This directory contains the machine learning components for the CleanSight waste detection system. The ML pipeline is split into two phases:

- **Phase 1** — Binary classification (trash vs. non-trash)
- **Phase 2** — Waste category classification (plastic, paper, glass, mixed)

In the full pipeline, Phase 1 first determines whether an image contains waste. If it does, Phase 2 classifies the type of waste. Backend integration and admin review flows are handled in separate branches.

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

## Phase 2 — Waste Category Classification

Phase 2 classifies waste images into one of four categories. It is designed to run **after** Phase 1 confirms the image contains trash.

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
- Loads images from `ML/dataset_category/` using `image_dataset_from_directory`
- Uses 224×224 image size with 80/20 validation split
- Applies data augmentation (random flip, rotation, zoom, contrast)
- Uses MobileNetV2 transfer learning (frozen base → fine-tuned top layers)
- Saves the best model to `ML/models/waste_category_classifier.keras`
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
| `--model` | `ML/models/waste_category_classifier.keras` | Path to model file |
| `--labels` | `ML/models/category_class_names.json` | Path to class names JSON |

The script outputs the predicted category, confidence score, and per-class probabilities.

### Evaluation

```bash
python -m ML.evaluation.evaluate_category_model
```

Reports accuracy, precision, recall, F1-score (per class), and saves a confusion matrix to `ML/artifacts/category_confusion_matrix.png`.

### Dataset Check

```bash
python -m ML.utils.check_category_dataset
```

Scans the category dataset folders, counts images per class, reports distribution, and detects invalid or corrupted files.

---

## Model Artifacts

| File | Description |
|------|-------------|
| `models/trash_classifier.keras` | Phase 1 binary model |
| `models/waste_category_classifier.keras` | Phase 2 category model |
| `models/category_class_names.json` | Phase 2 class name order (saved during training) |
| `artifacts/category_training_history.png` | Phase 2 training accuracy/loss plot |
| `artifacts/category_confusion_matrix.png` | Phase 2 evaluation confusion matrix |

All model files and artifacts are git-ignored.

---

## How Phase 1 and Phase 2 Work Together

```
    Image Input
         │
    ┌────▼────┐
    │ Phase 1 │  → trash or non-trash?
    └────┬────┘
         │ (trash confirmed)
    ┌────▼────┐
    │ Phase 2 │  → plastic / paper / glass / mixed
    └─────────┘
```

A future integration branch will combine both phases into a single prediction flow and connect them to the backend API.

---

## Setup and Installation

### Prerequisites

- Python 3.9 or 3.10 (recommended for TensorFlow 2.15 compatibility)
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

**Note**: This installs packages for training and inference (TensorFlow 2.15.0, matplotlib, seaborn, scikit-learn). For the ML service only (FastAPI), use `pip install -r ML/requirements_service.txt` instead. Both files use TensorFlow 2.15.0 for consistency.

This will install:
- `tensorflow==2.15.0` — Deep learning framework
- `Pillow==10.2.0` — Image processing
- `numpy==1.26.4` — Numerical computing
- `matplotlib==3.8.3` — Plotting and visualization
- `seaborn==0.13.2` — Statistical visualization
- `scikit-learn==1.4.1.post1` — Machine learning metrics

### Step 4: Verify TensorFlow Installation

Test that TensorFlow is correctly installed:

```powershell
python -c "import tensorflow as tf; print('TensorFlow version:', tf.__version__)"
```

Expected output:

```
TensorFlow version: 2.15.0
```

### Common Issues and Solutions

#### Issue: "ModuleNotFoundError: No module named 'tensorflow'"

**Cause**: TensorFlow is not installed in the active environment.

**Solution**:
1. Verify your virtual environment is activated (check for `(venv)` prefix)
2. Install dependencies: `pip install -r ML/requirements.txt`
3. If the issue persists, reinstall TensorFlow: `pip install tensorflow==2.15.0`

#### Issue: "ModuleNotFoundError: No module named 'seaborn'"

**Cause**: seaborn is not installed in the active environment.

**Solution**:
1. Verify your virtual environment is activated
2. Install seaborn: `pip install seaborn==0.13.2`
3. Or reinstall all dependencies: `pip install -r ML/requirements.txt`

#### Issue: Virtual environment activation fails (PowerShell)

**Cause**: PowerShell execution policy restriction.

**Solution**:
Run PowerShell as Administrator and execute:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try activating again: `.\venv\Scripts\Activate.ps1`

#### Issue: Python command not found

**Cause**: Python is not in your system PATH.

**Solution**:
1. Reinstall Python and check "Add Python to PATH" during installation
2. Or use the full path to python.exe: `C:\Python310\python.exe -m venv venv`

#### Issue: "pip install -r ML/requirements.txt" fails with encoding error

**Cause**: The requirements.txt file may be encoded incorrectly (UTF-16 instead of UTF-8).

**Solution**:
1. Check file encoding in VS Code (bottom-right status bar should show "UTF-8")
2. If it shows UTF-16, click encoding → "Save with Encoding" → UTF-8
3. Retry installation: `pip install -r ML/requirements.txt`
4. Verify installation: `pip show tensorflow pillow numpy matplotlib seaborn scikit-learn`

#### Issue: TensorFlow version mismatch between training and service

**Cause**: Using different TensorFlow versions can cause model loading failures.

**Solution**:
- Both `ML/requirements.txt` and `ML/requirements_service.txt` now use TensorFlow 2.15.0 for consistency
- Use `requirements.txt` for training/inference development
- Use `requirements_service.txt` for deploying the FastAPI service
- To verify versions: `pip show tensorflow numpy`

### Running ML Scripts

Always ensure your virtual environment is activated before running scripts. From the project root:

**Check datasets:**
```powershell
python -m ML.utils.check_dataset          # Phase 1 dataset
python -m ML.utils.check_category_dataset  # Phase 2 dataset
```

**Train models:**
```powershell
python -m ML.training.train_binary_model    # Phase 1 training
python -m ML.training.train_category_model  # Phase 2 training
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

## Future Branches

The following features are planned for later branches (not included here):

- Phase 2 training/tuning optimizations
- Phase 2 backend integration
- Phase 2 admin review flow
- Combined Phase 1 → Phase 2 prediction endpoint
