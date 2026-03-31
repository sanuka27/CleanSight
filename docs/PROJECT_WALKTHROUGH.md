# 🚀 CleanSight — Project Walkthrough

A practical guide to understanding, presenting, and demonstrating the CleanSight platform. Use this during demos, vivas, or project presentations.

---

## What is CleanSight?

CleanSight is a **community waste management platform** that connects citizens, volunteers, and administrators around a shared goal: making neighborhoods cleaner.

Citizens report waste by uploading a photo and tagging the location. Two machine learning models automatically validate and classify the waste. Volunteers claim and resolve reports. Admins oversee the entire flow, review edge cases, and track performance via an analytics dashboard.

**Key differentiator:** CleanSight doesn't just collect reports — it uses AI to filter invalid submissions, classify waste types, and surface low-confidence predictions for human review, making the whole system more reliable and efficient.

---

## User Roles

| Role | What They Do |
|------|-------------|
| **Citizen** | Submit waste reports with photo + GPS location |
| **Volunteer** | Browse and claim tasks; execute and log cleanup |
| **Staff** | Coordinate volunteers and monitor region progress |
| **Admin** | Full access — review ML queues, manage all reports, view analytics |

Role-based access is enforced on both the frontend (route guards) and backend (middleware).

---

## High-Level System Architecture

```
  ┌────────────────────────────────────────────────┐
  │                  Frontend (React)               │
  │  Port 8080  —  Vite + TypeScript + shadcn/ui   │
  └───────────────────────┬────────────────────────┘
                          │ REST API
  ┌───────────────────────▼────────────────────────┐
  │              Backend (Node.js / Express)         │
  │  Port 5000  —  MongoDB + Firebase Auth + RBAC   │
  └──────────┬──────────────────────┬──────────────┘
             │                      │
    Phase 1  │              Phase 2 │
  ┌──────────▼────────┐  ┌──────────▼────────┐
  │  ML Phase 1       │  │  ML Phase 2        │
  │  FastAPI (Port    │  │  FastAPI (Port     │
  │  8000)            │  │  8001)             │
  │  TensorFlow       │  │  PyTorch           │
  │  Trash/Non-trash  │  │  plastic / paper / │
  │                   │  │  glass / mixed     │
  └───────────────────┘  └────────────────────┘
             │                      │
             └──────────┬───────────┘
                        │
               ┌────────▼────────┐
               │    MongoDB       │
               │  (Reports DB)    │
               └─────────────────┘
```

---

## The Report Lifecycle (Full Flow)

Here is exactly what happens when a user submits a waste report:

```
1. User uploads image + GPS tag (Frontend)
         │
2. Frontend sends request to Backend   (/api/reports)
         │
3. Backend forwards image to ML Phase 1 (/predict  @ :8000)
         │
         ├──► NON-TRASH → Report rejected / flagged as invalid
         │
         └──► TRASH → continues...
         │
4. Backend forwards image to ML Phase 2 (/predict-category @ :8001)
         │
         ├──► HIGH confidence → auto-accepted, stored in DB
         │
         └──► LOW confidence → stored with "manual_review" flag
                                       │
5. Admin Review Queue surfaces flagged reports
         │
         ├──► Admin APPROVES → report is validated and dispatched
         │
         └──► Admin REJECTS → report is marked invalid
         │
6. Approved report appears in Community Dashboard
         │
7. Volunteer claims → executes cleanup → logs completion
         │
8. Admin marks resolved → analytics updated
```

---

## ML Phase 1 — Binary Classifier (Trash vs. Non-Trash)

- **Model:** MobileNetV2 (TensorFlow/Keras)
- **Task:** Is there waste in this image? Yes or No.
- **Service:** FastAPI on port 8000
- **Endpoint:** `POST /predict`
- **Output:** `{ label: "trash" | "non_trash", confidence: 0.xx, recommendation: "automated_approval" | "manual_review" }`
- **Threshold:** Confidence ≥ 0.70 → auto-accept; below → manual review

**Why this matters:** Without Phase 1, users could submit photos of anything (food, pets, selfies) as "waste reports." Phase 1 filters these out automatically.

---

## ML Phase 2 — Category Classifier (Waste Type)

- **Model:** MobileNetV3-Small (PyTorch) — chosen for Python 3.14 compatibility on Windows
- **Task:** What type of waste is this? plastic / paper / glass / mixed
- **Service:** FastAPI on port 8001
- **Endpoint:** `POST /predict-category`
- **Output:** `{ success: true, predicted_class: "plastic", confidence: 0.87, confidence_level: "HIGH", entropy: 0.12, all_predictions: [...] }`
- **Classes:** `glass`, `mixed`, `paper`, `plastic`
- **Confidence levels:** HIGH (≥80%), MODERATE (≥50%), LOW (≥30%), VERY LOW (<30%)

**Why this matters:** Knowing the waste type helps municipalities allocate the right resources — recycling teams for plastic/paper, specialist crews for glass, general waste for mixed.

---

## Admin Review Flow

When predictions are low-confidence:
1. The report is saved to MongoDB with status `pending_review`
2. It appears in **Admin Dashboard → ML Review Queue**
3. The admin sees the original image, Phase 1 label, Phase 2 category, confidence scores, and entropy
4. Admin clicks **Approve** or **Reject**
5. Approved reports move to the community dashboard for volunteers to claim

This human-in-the-loop design prevents incorrect ML predictions from creating bad data in the system.

---

## Analytics Dashboard

Available to Admins at **Admin Dashboard → ML Analytics**.

The dashboard shows:
- Total predictions by phase
- Confidence score distributions (histogram)
- Manual review rate (how often does the model need human help?)
- Per-class accuracy breakdown (which waste types are hardest to classify?)
- Weak class identification (F1 < 0.80 triggers warnings)
- Trend over time (improving or degrading?)

**Demo tip:** Submit 5–10 test reports before the demo so the analytics charts have real data to display.

---

## Step-by-Step Demo Script

### Before the demo:
1. Start all 4 services (Backend, ML Phase 1, ML Phase 2, Frontend)
2. Verify health: http://localhost:8000/health and http://localhost:8001/health
3. Prepare test images: 1× plastic, 1× paper, 1× non-trash, 1× ambiguous/blurry
4. Log in as a citizen user and as an admin in two browser tabs

---

### Demo Step 1 — Show the Landing Page
- Open http://localhost:8080
- Explain CleanSight's purpose in 2–3 sentences

### Demo Step 2 — Submit a Waste Report (Citizen View)
- Log in as citizen
- Go to "Report Waste"
- Upload your plastic bottle image + add location
- Submit
- Point to the terminal logs — show Phase 1 and Phase 2 being called in real time

### Demo Step 3 — Show the Auto-Accepted Report
- Navigate to the community dashboard or report list
- Show the report with its ML-assigned category (e.g., "Plastic")

### Demo Step 4 — Demonstrate Low-Confidence Review (Admin View)
- Switch to admin tab
- Submit the ambiguous image, or explain it was already submitted
- Show **Admin → ML Review Queue**
- Approve or reject a pending report

### Demo Step 5 — Volunteer Flow (Optional)
- Log in as volunteer
- Claim an open task
- Mark it as resolved

### Demo Step 6 — Analytics Dashboard
- Show **Admin → ML Analytics**
- Walk through the charts — prediction counts, confidence distribution, per-class accuracy

### Demo Step 7 — ML API Docs (Technical Bonus)
- Open http://localhost:8000/docs and http://localhost:8001/docs
- Show the FastAPI Swagger UI
- Demonstrate calling `/predict` or `/predict-category` directly from the browser

---

## Talking Points for Supervisors / Examiners

- "CleanSight uses a two-stage ML pipeline — Phase 1 filters out non-waste images, and Phase 2 classifies waste type. This prevents both false positives and wasted volunteer effort."
- "Phase 2 uses PyTorch with MobileNetV3-Small because TensorFlow doesn't officially support Python 3.14 on Windows, which is our development platform."
- "Low-confidence predictions are never auto-accepted — they go into an admin review queue. This is a deliberate human-in-the-loop design decision."
- "The analytics dashboard gives administrators visibility into model performance and helps identify which waste categories the model struggles with, enabling targeted dataset improvements."
- "The system is fully integrated end-to-end — there are no mock predictions or placeholder data. Every report submission triggers real ML inference."

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express.js, MongoDB, Mongoose |
| Auth | Firebase Authentication + Admin SDK |
| ML Phase 1 | TensorFlow/Keras, MobileNetV2, FastAPI |
| ML Phase 2 | PyTorch, MobileNetV3-Small, FastAPI |
| ML Tools | Scikit-learn, Matplotlib, Seaborn, Pillow |

---

*CleanSight — Building technology for cleaner, greener communities.*
