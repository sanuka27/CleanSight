---
title: CleanSight ML Binary Classifier
emoji: 🗑️
colorFrom: green
colorTo: blue
sdk: docker
pinned: false
license: mit
short_description: Phase 1 binary waste/non-waste classifier (FastAPI)
---

# CleanSight ML Phase 1 – Binary Classifier

FastAPI service that classifies whether an image contains **waste or not**.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/predict` | Classify image as waste / non-waste |

## Request format (`/predict`)

Send a `multipart/form-data` request with either:
- `image` – an uploaded image file, **or**
- `image_url` – a public URL pointing to an image

## Response

```json
{
  "success": true,
  "isWaste": true,
  "label": "trash",
  "confidence": 0.94,
  "recommendation": "dispose",
  "category": null
}
```
