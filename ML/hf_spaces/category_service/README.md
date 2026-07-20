---
title: CleanSight ML Category Classifier
emoji: ♻️
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
license: mit
short_description: Phase 2 waste category classifier – plastic/paper/glass/mixed (FastAPI)
---

# CleanSight ML Phase 2 – Category Classifier

FastAPI service that classifies **what type of waste** is in an image (plastic, paper, glass, mixed).

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/predict-category` | Classify waste category |

## Request format (`/predict-category`)

Send a `multipart/form-data` request with either:
- `image` – an uploaded image file, **or**
- `image_url` – a public URL pointing to an image

## Response

```json
{
  "success": true,
  "isWaste": true,
  "category": "plastic",
  "predicted_class": "plastic",
  "confidence": 0.91,
  "entropy": 0.12,
  "confidence_level": "HIGH",
  "review_status": "auto_approved",
  "all_predictions": [
    { "class_name": "plastic", "confidence": 0.91 },
    { "class_name": "paper",   "confidence": 0.05 },
    { "class_name": "glass",   "confidence": 0.03 },
    { "class_name": "mixed",   "confidence": 0.01 }
  ]
}
```
