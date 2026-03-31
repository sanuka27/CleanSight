# 🧪 CleanSight — ML Test Flow Guide

A practical guide to manually testing the end-to-end ML pipeline (Phase 1 + Phase 2) in CleanSight.

---

## Overview: The Two-Phase ML Pipeline

```
  Image Upload (Frontend)
         │
         ▼
  Backend receives image
         │
         ▼
  ┌─────────────────┐
  │   Phase 1       │  Binary classification (TensorFlow/Keras)
  │   Trash or      │  Service: http://localhost:8000/predict
  │   Non-Trash?    │
  └────────┬────────┘
           │
     ┌─────┴──────┐
     │            │
  non-trash     trash
     │            │
     ▼            ▼
  Rejected   ┌─────────────────┐
             │   Phase 2       │  Category classification (PyTorch)
             │   plastic /     │  Service: http://localhost:8001/predict-category
             │   paper /       │
             │   glass /       │
             │   mixed?        │
             └────────┬────────┘
                      │
           ┌──────────┴──────────┐
           │                     │
      high confidence      low confidence
           │                     │
           ▼                     ▼
    auto-accepted          queued for
    (stored in DB)         admin review
```

Both Phase 1 and Phase 2 results are stored in the report record in MongoDB, and are visible in the admin review queue and analytics dashboard.

---

## Prerequisites

Before running any tests, verify:

1. All three services are running (Backend, ML Phase 1 on 8000, ML Phase 2 on 8001, Frontend)
2. Both model files exist:
   - `ML/models/trash_classifier.keras`
   - `ML/models/waste_category_classifier.pt`
   - `ML/models/category_class_names.json`
3. Health checks pass:
   - http://localhost:8000/health → `{"status":"ok"}`
   - http://localhost:8001/health → `{"status":"ok","service":"category-classification"}`

---

## Phase 1 — Binary Classifier Test

### Standalone CLI Test (from project root)

```bash
cd ML
.\venv\Scripts\Activate.ps1

# Test with a trash image
python -m ML.inference.predict_image --image path\to\trash_image.jpg

# Test with a non-trash image
python -m ML.inference.predict_image --image path\to\clean_scene.jpg
```

**Expected output (trash):**
```
Label:      TRASH
Confidence: 0.92
```

**Expected output (non-trash):**
```
Label:      NON_TRASH
Confidence: 0.89
```

### Via API (Phase 1 service direct call)

```bash
# Windows PowerShell — submit an image file
Invoke-RestMethod -Uri "http://localhost:8000/predict" `
  -Method POST `
  -Form @{ image = Get-Item "path\to\image.jpg" }
```

Expected response:
```json
{
  "label": "trash",
  "confidence": 0.91,
  "recommendation": "automated_approval"
}
```

---

## Phase 2 — Category Classifier Test

### Standalone CLI Test (from project root)

```bash
cd ML
.\venv\Scripts\Activate.ps1

# Predict category
python -m ML.inference.predict_category --image path\to\plastic_bottle.jpg

# JSON output (useful for checking programmatic use)
python -m ML.inference.predict_category --image path\to\plastic_bottle.jpg --json
```

**Expected human-readable output:**
```
Predicted Category:  PLASTIC
Confidence:          87.32%
Confidence Level:    HIGH
```

**Expected JSON output:**
```json
{
  "predicted_class": "plastic",
  "confidence": 0.873,
  "entropy": 0.12,
  "confidence_level": "HIGH",
  "all_predictions": [...]
}
```

### Via API (Phase 2 service direct call)

```bash
Invoke-RestMethod -Uri "http://localhost:8001/predict-category" `
  -Method POST `
  -Form @{ image = Get-Item "path\to\plastic_bottle.jpg" }
```

Expected response:
```json
{
  "success": true,
  "predicted_class": "plastic",
  "confidence": 0.87,
  "entropy": 0.12,
  "confidence_level": "HIGH",
  "all_predictions": [
    {"class_name": "plastic", "confidence": 0.87},
    {"class_name": "mixed",   "confidence": 0.08},
    {"class_name": "paper",   "confidence": 0.03},
    {"class_name": "glass",   "confidence": 0.02}
  ]
}
```

---

## End-to-End Flow Test (via Frontend)

This is the most realistic test for demo day.

### Test Case 1 — Obvious Trash (Plastic)

1. Log in as a user at http://localhost:8080
2. Navigate to "Report Waste"
3. Upload a **clear plastic bottle or plastic bag** image
4. Add location and description
5. Submit

**What to check:**
- ✅ Backend terminal: logs Phase 1 call + `label: trash`
- ✅ Backend terminal: logs Phase 2 call + `predicted_class: plastic`
- ✅ Report saved in DB with ML fields populated
- ✅ Frontend shows success confirmation

---

### Test Case 2 — Obvious Non-Trash

1. Upload a **clear outdoor/nature scene** image (grass, sky, clean pavement)
2. Submit

**What to check:**
- ✅ Backend terminal: logs Phase 1 call + `label: non_trash`
- ✅ Report is rejected or marked as invalid (not stored as a valid report)
- ✅ Frontend shows appropriate rejection message

---

### Test Case 3 — Low-Confidence / Ambiguous Image

1. Upload a **blurry or ambiguous** image (e.g., a partially visible object)
2. Submit

**What to check:**
- ✅ Backend terminal: `confidence: 0.5x` (low)
- ✅ `recommendation: manual_review`
- ✅ Report appears in **Admin → ML Review Queue**
- ✅ Admin can approve or reject from the queue

---

### Test Case 4 — Paper Waste

1. Upload an image of **crumpled paper, cardboard, or newspaper**
2. Submit

**What to check:**
- ✅ Phase 1: `label: trash`
- ✅ Phase 2: `predicted_class: paper`

---

### Test Case 5 — Glass Waste

1. Upload an image of a **glass bottle, jar, or broken glass**
2. Submit

**What to check:**
- ✅ Phase 1: `label: trash`
- ✅ Phase 2: `predicted_class: glass`

---

### Test Case 6 — Mixed Waste

1. Upload an image of a **pile of mixed rubbish** (different types together)
2. Submit

**What to check:**
- ✅ Phase 1: `label: trash`
- ✅ Phase 2: `predicted_class: mixed`

---

## What to Check in Logs

**Backend terminal (useful log lines):**
```
[ML Service] Calling http://localhost:8000/predict
[ML Service] Phase 1 result: {"label":"trash","confidence":0.91,"recommendation":"automated_approval"}
[ML Service] Calling http://localhost:8001/predict-category
[ML Service] Phase 2 result: {"success":true,"predicted_class":"plastic","confidence":0.87,...}
```

**ML Phase 1 terminal:**
```
INFO:     Received prediction request
INFO:     POST /predict 200 OK
```

**ML Phase 2 terminal:**
```
INFO:     Category prediction request
INFO:     POST /predict-category 200 OK
```

---

## Pass/Fail Criteria

| Check | Pass | Fail |
|-------|------|------|
| Phase 1 health | `{"status":"ok"}` | Any error / 503 |
| Phase 2 health | `{"status":"ok","service":"category-classification"}` | Any error / 503 |
| Phase 1 trash prediction | Returns `label: trash`, confidence > 0 | Exception / empty response |
| Phase 1 non-trash prediction | Returns `label: non_trash` | Misclassifies as trash |
| Phase 2 category prediction | Returns `success: true`, valid class name | `success: false` or unknown class |
| Low-confidence gating | Report queued for admin review | Report auto-accepted with low confidence |
| Report saved in DB | ML fields populated in report document | ML fields null or missing |

---

## Manual Validation Tips for Demo Day

- **Prepare test images in advance** — have one for each category and one clean non-trash image ready.
- **Have browser DevTools open** — check Network tab for API calls from the frontend.
- **Have all terminal windows visible** — side-by-side if possible; log output is very reassuring for interviewers.
- **Use http://localhost:8000/docs and http://localhost:8001/docs** — FastAPI Swagger UI lets you test the ML endpoints interactively without writing any code.
- **Have a low-confidence/blurry image ready** — demonstrating the admin review queue flow is a great talking point.
- **Check the analytics dashboard last** — after submitting a few reports, the charts will show real data.

---

*CleanSight — Building technology for cleaner, greener communities.*
