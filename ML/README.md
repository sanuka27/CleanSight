# CleanSight ML Module

This directory contains the machine learning components for the CleanSight waste detection system. The ML pipeline is split into two phases:

- **Phase 1** — Binary classification (trash vs. non-trash) — TensorFlow/Keras
- **Phase 2** — Waste category classification (plastic, paper, glass, mixed) — **PyTorch**

In the full pipeline, Phase 1 first determines whether an image contains waste. If it does, Phase 2 classifies the type of waste. Both phases are served via separate FastAPI services and fully integrated with the backend and admin review flow.

> **Note**: Phase 2 uses PyTorch for Python 3.14+ compatibility on Windows. See the "Why PyTorch?" section below for details.

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

### Dataset Validation

Before training, validate your dataset to check for class imbalance and corrupted files:

```bash
python -m ML.utils.check_category_dataset
```

Options:
| Flag | Description |
|------|-------------|
| `--dataset` | Path to dataset directory (default: ML/dataset_category) |
| `--save-report` | Save a JSON summary report to ML/reports/ |

The validation script reports:
- Image counts per class with visual distribution bars
- Class imbalance ratio and severity warnings
- Invalid or corrupted files
- Recommendations for handling imbalanced data

### Training

```bash
python -m ML.training.train_category_model
```

Options:
| Flag | Default | Description |
|------|---------|-------------|
| `--epochs` | 15 | Epochs for initial training (frozen backbone) |
| `--fine-tune-epochs` | 10 | Epochs for fine-tuning phase |
| `--no-class-weights` | off | Disable class weighting (not recommended) |

#### How Training Works

The training pipeline includes:

1. **Dataset Loading** — Images loaded from `ML/dataset_category/` using `torchvision.datasets.ImageFolder`
2. **Class Distribution Analysis** — Reports per-class counts and imbalance ratio before training
3. **Class Imbalance Handling** — Computes class weights (inverse frequency) and applies them to the loss function
4. **Two-Phase Training**:
   - **Phase 1**: Train classifier head only (frozen backbone, LR=1e-3)
   - **Phase 2**: Fine-tune entire model (unfrozen backbone, LR=1e-5)
5. **Best Model Checkpointing** — Saves model with best validation accuracy
6. **Reproducibility** — Fixed random seed (42) for consistent results

#### Class Imbalance Handling

The training pipeline automatically handles class imbalance using **weighted loss**:

- Classes with fewer samples receive higher weights in the loss function
- Weight formula: `weight[class] = total_samples / (num_classes * class_count)`
- Weights are normalized so the average is 1.0

This approach helps the model:
- Pay more attention to minority classes
- Reduce bias toward majority classes
- Improve F1-score on underrepresented classes (e.g., plastic)

To disable class weighting (not recommended for imbalanced data):
```bash
python -m ML.training.train_category_model --no-class-weights
```

#### Training Outputs

| File | Description |
|------|-------------|
| `models/waste_category_classifier.pt` | Best model weights |
| `models/category_class_names.json` | Class name order (for inference) |
| `artifacts/category_training_history.png` | Training/validation accuracy and loss plot |
| `artifacts/category_training_history.json` | Raw training metrics for analysis |
| `reports/category_training_report.json` | Comprehensive training configuration and results |

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
| `--top-k` | all | Number of top predictions to show |
| `--json` | off | Output result as JSON (for programmatic use) |

The script outputs:
- Predicted category with confidence score
- All class probabilities ranked by confidence
- Confidence interpretation (HIGH / MODERATE / LOW / VERY LOW)
- Entropy-based uncertainty metric
- Recommendations for low-confidence predictions

Example human-readable output:
```
===========================================================
  CATEGORY PREDICTION RESULT
===========================================================

  Image: test_image.jpg
  Size:  640x480 px

-----------------------------------------------------------
  Predicted Category:  PLASTIC
  Confidence:          87.32%
  Uncertainty:         0.234 (entropy)
-----------------------------------------------------------

  Confidence Level: HIGH
  Model is confident in this prediction
  Prediction can be trusted

-----------------------------------------------------------
  All Class Scores:
-----------------------------------------------------------

    plastic  87.32%  ██████████████████████████████ <--
    mixed    8.45%   ██
    paper    3.12%   █
    glass    1.11%

===========================================================
  Status: PLASTIC (HIGH confidence)
===========================================================
```

For programmatic use (API integration), use `--json`:
```bash
python -m ML.inference.predict_category --image test.jpg --json
```

### Evaluation

```bash
python -m ML.evaluation.evaluate_category_model
```

Options:
| Flag | Default | Description |
|------|---------|-------------|
| `--model` | `ML/models/waste_category_classifier.pt` | Path to model file |
| `--labels` | `ML/models/category_class_names.json` | Path to class names JSON |
| `--dataset` | `ML/dataset_category` | Path to dataset directory |

#### Evaluation Metrics

The evaluation script reports:

**Overall Metrics:**
- Validation Loss
- Accuracy
- Macro Precision, Recall, F1-Score
- Weighted F1-Score

**Per-Class Metrics:**
- Precision, Recall, F1-Score for each class
- Support (number of samples) per class

**Weak Class Analysis:**
- Automatically identifies classes with F1-score < 0.80
- Highlights common misclassification pairs
- Provides recommendations for improvement

#### Evaluation Outputs

| File | Description |
|------|-------------|
| `artifacts/category_confusion_matrix.png` | Confusion matrix heatmap |
| `artifacts/category_confusion_matrix_normalized.png` | Normalized confusion matrix |
| `artifacts/category_per_class_metrics.png` | Per-class precision/recall/F1 bar chart |
| `reports/category_evaluation_report.json` | Comprehensive JSON report |
| `reports/category_evaluation_report.txt` | Human-readable text report |

---

## Model Artifacts Summary

| File | Description |
|------|-------------|
| `models/trash_classifier.keras` | Phase 1 binary model (TensorFlow) |
| `models/waste_category_classifier.pt` | Phase 2 category model (PyTorch) |
| `models/category_class_names.json` | Phase 2 class name order |
| `artifacts/category_training_history.png` | Training accuracy/loss plot |
| `artifacts/category_training_history.json` | Raw training metrics |
| `artifacts/category_confusion_matrix.png` | Evaluation confusion matrix |
| `artifacts/category_confusion_matrix_normalized.png` | Normalized confusion matrix |
| `artifacts/category_per_class_metrics.png` | Per-class metrics plot |
| `reports/category_dataset_report.json` | Dataset validation report |
| `reports/category_training_report.json` | Training configuration/results |
| `reports/category_evaluation_report.json` | Evaluation metrics (JSON) |
| `reports/category_evaluation_report.txt` | Evaluation metrics (text) |

All model files, artifacts, and reports are git-ignored.

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

Both phases are fully integrated into the backend API and the admin review flow. Phase 1 runs on port 8000; Phase 2 category service runs on port 8001.

---

## Setup and Installation

### Prerequisites

**Phase 2 (PyTorch):**
- **Python 3.10+** (tested on Python 3.14.3 on Windows)
- Windows PowerShell or Command Prompt

**Phase 1 (TensorFlow):**
- **Python 3.9 or 3.10** (recommended for TensorFlow 2.15 compatibility)
- Note: If you need to run both phases, consider using separate virtual environments

> **Important**: Phase 1 and Phase 2 have different Python version requirements. Phase 2 (PyTorch) supports Python 3.10+ including Python 3.14, while Phase 1 (TensorFlow) requires Python 3.9-3.10. If you only need Phase 2, you can use the latest Python version.

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

**For Phase 2 (PyTorch) only:**

With the virtual environment activated, install the Phase 2 requirements:

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

**For Phase 1 (TensorFlow) only:**

Phase 1 requires TensorFlow 2.15 and Python 3.9-3.10. Install Phase 1 dependencies in a separate virtual environment:

```powershell
pip install -r ML/requirements_service.txt
```

> **Note**: If you need to run both phases, create separate virtual environments (e.g., `venv-phase1` with Python 3.10 for TensorFlow, and `venv-phase2` with Python 3.10+ for PyTorch).

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
python -m ML.utils.check_dataset              # Phase 1 dataset
python -m ML.utils.check_category_dataset     # Phase 2 dataset
python -m ML.utils.check_category_dataset --save-report  # With report
```

**Train models:**
```powershell
python -m ML.training.train_binary_model      # Phase 1 training (TensorFlow)
python -m ML.training.train_category_model    # Phase 2 training (PyTorch)
```

**Run inference:**
```powershell
python -m ML.inference.predict_image --image path/to/image.jpg           # Phase 1
python -m ML.inference.predict_category --image path/to/image.jpg        # Phase 2
python -m ML.inference.predict_category --image path/to/image.jpg --json # Phase 2 JSON
```

**Evaluate models:**
```powershell
python -m ML.evaluation.evaluate_model              # Phase 1 evaluation
python -m ML.evaluation.evaluate_category_model     # Phase 2 evaluation
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

