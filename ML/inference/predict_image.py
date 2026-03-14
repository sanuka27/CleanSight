import os
import sys
import argparse
import json

# Suppress verbose TF logging for cleaner output (must be set before importing TensorFlow)
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import load_img, img_to_array

# Configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'trash_classifier.keras')
CLASS_NAMES_PATH = os.path.join(BASE_DIR, 'models', 'class_names.json')
IMG_SIZE = (224, 224)

def load_class_names():
    \"\"\"Loads the class names mapping saved during training.\"\"\"
    if os.path.exists(CLASS_NAMES_PATH):
        with open(CLASS_NAMES_PATH, 'r') as f:
            return json.load(f)
    print(f"Warning: Class names file not found at {CLASS_NAMES_PATH}.")
    print("Falling back to standard alphabetical order.")
    return ['non-trash', 'trash']

def predict(image_path, model, class_names):
    \"\"\"Predicts whether an image is trash or non-trash.\"\"\"
    if not os.path.exists(image_path):
        print(f"Error: Image not found at {image_path}")
        return None, None

    try:
        # Load and preprocess the image
        img = load_img(image_path, target_size=IMG_SIZE)
        img_array = img_to_array(img)
        # Add a batch dimension (model expects batches, e.g. (1, 224, 224, 3))
        img_array = tf.expand_dims(img_array, 0) 
        
        # Note: Preprocessing logic (scaling to [-1, 1]) is inside the model via `preprocess_input` layer
        
        # Get raw prediction score (sigmoid output between 0 and 1)
        predictions = model.predict(img_array, verbose=0)
        score = predictions[0][0]
        
        # Convert sigmoid score to label classification
        # Closer to 0 -> non-trash, closer to 1 -> trash (Assuming 'non-trash' is 0, 'trash' is 1)
        predicted_class_idx = 1 if score > 0.5 else 0
        predicted_label = class_names[predicted_class_idx]
        
        # Calculate confidence percentage
        confidence = score if predicted_class_idx == 1 else (1 - score)
        confidence_pct = confidence * 100
        
        return predicted_label, confidence_pct
        
    except Exception as e:
        print(f"Failed to process image: {e}")
        return None, None

def main():
    parser = argparse.ArgumentParser(description="Predict if an image contains trash.")
    parser.add_argument("image_path", type=str, help="Path to the image to classify.")
    args = parser.parse_args()

    image_path = args.image_path

    if not os.path.exists(MODEL_PATH):
        print(f"Error: Trained model not found at {MODEL_PATH}")
        print("Please train the model first by running: python training/train_binary_model.py")
        sys.exit(1)

    print("Loading model...")
    model = load_model(MODEL_PATH)
    
    class_names = load_class_names()

    print(f"Processing image: {image_path}...")
    label, confidence = predict(image_path, model, class_names)

    if label:
        print("\n=== PREDICTION RESULT ===")
        print(f"Label:      {label}")
        print(f"Confidence: {confidence:.2f}%")
        print("=========================")

if __name__ == '__main__':
    main()
