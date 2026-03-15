import os
import numpy as np
import tensorflow as tf
from PIL import Image
import io
import warnings
import urllib.request

warnings.filterwarnings('ignore')

# Provide a fallback model logic if the real model file is not found (to handle missing files in student environment gracefully for now, or assume it's there)
# In this branch, we must use real prediction flow.
MODEL_PATH = os.getenv("MODEL_PATH", os.path.join(os.path.dirname(__file__), "..", "models", "binary_trash_model.h5"))

model = None
IMG_SIZE = (224, 224)

def load_model():
    global model
    if model is None:
        try:
            if os.path.exists(MODEL_PATH):
                model = tf.keras.models.load_model(MODEL_PATH)
                print(f"Model loaded successfully from {MODEL_PATH}")
            else:
                print(f"Warning: Model not found at {MODEL_PATH}. Prediction will fail unless model is provided.")
        except Exception as e:
            print(f"Error loading model: {e}")

def predict_image(image_bytes: bytes) -> tuple[str, float]:
    """
    Returns (label, confidence).
    Assuming model outputs a single sigmoid probability where > 0.5 is trash.
    If multiple class, logic must be adjusted. Assuming standard binary classifier here.
    """
    if model is None:
        raise RuntimeError("Model is not loaded.")
        
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = img.resize(IMG_SIZE)
        img_array = tf.keras.preprocessing.image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = img_array / 255.0  # normalize
        
        predictions = model.predict(img_array)
        prob = float(predictions[0][0])
        
        # Binary: 0 = non-trash, 1 = trash (assumes standard layout).
        # We handle this generically.
        label = "trash" if prob > 0.5 else "non-trash"
        confidence = prob if label == "trash" else 1.0 - prob
        
        return label, confidence
        
    except Exception as e:
        raise RuntimeError(f"Error during prediction: {str(e)}")
