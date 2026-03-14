# CleanSight ML - Phase 1

This folder contains the Phase 1 Machine Learning pipeline for CleanSight. The goal of this phase is strictly binary classification: classifying if an image contains **trash** or **non-trash**.

## Directory Structure
- `dataset_binary/`: Contains real images organized in two subdirectories: `trash` and `non-trash`.
- `models/`: Where trained ML models and checkpoints are saved.
- `training/`: Scripts to build and train the models.
- `inference/`: Scripts to make predictions using the trained models.

## Setup

1. **Navigate to the `ML` directory:**
   ```bash
   cd ML
   ```

2. **Create a Python virtual environment:**
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment:**
   - **Windows:** `venv\Scripts\activate`
   - **Mac/Linux:** `source venv/bin/activate`

4. **Install the dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

## Training

To train the MobileNetV2-based binary classifier using transfer learning on your dataset, run:
```bash
python training/train_binary_model.py
```
This script will:
- Load images from `dataset_binary`.
- Use an 80/20 train/validation split.
- Apply data augmentation.
- Freeze the base MobileNetV2 model and train a classification head.
- Save the best model automatically to `models/trash_classifier.keras`.

*(Note: Validation metrics will be printed upon completion).*

## Inference

To classify an unseen image using the trained model, run:
```bash
python inference/predict_image.py path/to/image.jpg
```
The script will load the saved `.keras` model, preprocess the image to 224x224 pixels, and output the predicted class (`trash` or `non-trash`) along with the confidence score.

## Note on Future Phases
This phase focuses only on identifying the presence of waste. Advanced categorization of waste types (plastic, metal, organic, etc.) belongs to upcoming phases.
