import os
import json
import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
from tensorflow.keras.preprocessing.image import ImageDataGenerator


def evaluate(model_path="models/binary_classifier_v1.h5", dataset_dir="dataset_binary"):
    print(f"Loading model from {model_path}")
    if not os.path.exists(model_path):
        print(f"Model file {model_path} not found.")
        return

    model = tf.keras.models.load_model(model_path)
    
    # We will use ImageDataGenerator for evaluation
    datagen = ImageDataGenerator(rescale=1./255, validation_split=0.2)
    
    # Load dataset using validation subset if that's what we tested on
    val_generator = datagen.flow_from_directory(
        dataset_dir,
        target_size=(224, 224),
        batch_size=32,
        class_mode='binary',
        subset='validation',
        shuffle=False
    )
    
    if val_generator.samples == 0:
        print("No validation images found. Check your dataset split.")
        return
        
    print(f"Found {val_generator.samples} items. Evaluating...")
    loss, accuracy = model.evaluate(val_generator)
    print(f"Loss: {loss:.4f}, Accuracy: {accuracy:.4f}")

    predictions = model.predict(val_generator)
    predicted_classes = (predictions > 0.5).astype(int).flatten()
    
    true_classes = val_generator.classes
    class_labels = list(val_generator.class_indices.keys())

    report = classification_report(true_classes, predicted_classes, target_names=class_labels, output_dict=True)
    print("\nClassification Report:")
    print(classification_report(true_classes, predicted_classes, target_names=class_labels))

    # Save metrics report
    report_file = "reports/evaluation_metrics.json"
    os.makedirs(os.path.dirname(report_file), exist_ok=True)
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=4)
        
    print(f"Report saved to {report_file}")
    
    # Confusion matrix
    cm = confusion_matrix(true_classes, predicted_classes)
    plt.figure(figsize=(8,6))
    sns.heatmap(cm, annot=True, fmt='d', xticklabels=class_labels, yticklabels=class_labels, cmap='Blues')
    plt.xlabel('Predicted')
    plt.ylabel('True')
    plt.title('Confusion Matrix')
    
    cm_file = "artifacts/confusion_matrix.png"
    os.makedirs(os.path.dirname(cm_file), exist_ok=True)
    plt.savefig(cm_file)
    print(f"Confusion Matrix image saved to {cm_file}")


if __name__ == "__main__":
    evaluate()
