import os
from PIL import Image

def validate_dataset(dataset_dir="dataset_binary"):
    print(f"Validating dataset at: {dataset_dir}")
    if not os.path.exists(dataset_dir):
        print("Dataset directory not found.")
        return

    classes = ["trash", "non-trash"]
    
    total_valid = 0
    total_invalid = 0

    for cls in classes:
        cls_dir = os.path.join(dataset_dir, cls)
        if not os.path.exists(cls_dir):
            print(f"Class directory not found: {cls_dir}")
            continue
            
        valid_count = 0
        invalid_count = 0
        
        for root, _, files in os.walk(cls_dir):
            for file in files:
                filepath = os.path.join(root, file)
                try:
                    with Image.open(filepath) as img:
                        img.verify()
                        valid_count += 1
                except Exception as e:
                    print(f"Invalid image found: {filepath}")
                    print(f"Error: {e}")
                    invalid_count += 1
                    
        print(f"Class '{cls}': {valid_count} valid images, {invalid_count} invalid images.")
        total_valid += valid_count
        total_invalid += invalid_count

    print("---")
    print(f"Total valid images: {total_valid}")
    print(f"Total invalid images: {total_invalid}")

if __name__ == "__main__":
    validate_dataset()
