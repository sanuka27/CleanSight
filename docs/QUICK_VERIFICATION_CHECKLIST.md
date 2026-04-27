# ✅ CleanSight — Quick Verification Checklist

Use this before demos, presentations, or submission to confirm everything is working correctly.

---

## 1. Environment & Configuration

- [ ] `Frontend/.env` exists and contains real Firebase config values
- [ ] `Backend/.env` exists and contains real `MONGODB_URI`, `FIREBASE_*`, and `ML_SERVICE_URL`
- [ ] `ML/.env` exists (or defaults will be used — acceptable for local dev)
- [ ] No `.env` files are committed to git (check `.gitignore`)

**Key env vars to verify:**

| File | Key Variables |
|------|--------------|
| `Frontend/.env` | `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_API_BASE_URL=http://localhost:5000` |
| `Backend/.env` | `MONGODB_URI`, `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `ML_SERVICE_URL=http://localhost:8000` |
| `ML/.env` | `CATEGORY_MODEL_PATH=models/waste_category_classifier.pt` (if set) |

---

## 2. Model Artifacts

- [ ] `ML/models/trash_classifier.keras` exists (Phase 1 model)
- [ ] `ML/models/waste_category_classifier.pt` exists (Phase 2 model)
- [ ] `ML/models/category_class_names.json` exists (Phase 2 class name order)

> If models are missing, train them (see [ML/README.md](../ML/README.md)).

---

## 3. Dependency Installation

- [ ] Node packages installed:
  ```bash
  pnpm install   # from project root
  ```
- [ ] Python 3.11 venv created inside `ML/` (required for TensorFlow Phase 1):
  ```bash
  cd ML
  py -3.11 -m venv venv
  .\venv\Scripts\Activate.ps1
  pip install -r requirements_service.txt
  ```

---

## 4. Service Startup

Start in order — each in a separate terminal:

### Terminal 1 — Backend
```bash
cd Backend
npm run dev
```
✅ Expected: `Server running on http://localhost:5000`

### Terminal 2 — ML Phase 1 Service
```bash
cd ML
.\venv\Scripts\Activate.ps1
python -m uvicorn service.main:app --host 0.0.0.0 --port 8000 --reload
```
✅ Expected: `Uvicorn running on http://0.0.0.0:8000` + `Category model loaded successfully`

### Terminal 3 — ML Phase 2 Category Service
```bash
cd ML
.\venv\Scripts\Activate.ps1
python -m uvicorn category_service.main:app --host 0.0.0.0 --port 8001 --reload
```
✅ Expected: `Uvicorn running on http://0.0.0.0:8001` + `Category model loaded successfully`

### Terminal 4 — Frontend
```bash
cd Frontend
pnpm dev
```
✅ Expected: `Local: http://localhost:8080/`

---

## 5. Health Endpoints

Open these in your browser or run with curl:

| Check | URL | Expected Response |
|-------|-----|------------------|
| Backend | http://localhost:5000/api/health | `{"status":"ok"}` |
| ML Phase 1 | http://localhost:8000/health | `{"status":"ok"}` |
| ML Phase 2 | http://localhost:8001/health | `{"status":"ok","service":"category-classification"}` |
| Frontend | http://localhost:8080 | CleanSight landing page loads |

- [ ] Backend health passes
- [ ] ML Phase 1 health passes
- [ ] ML Phase 2 health passes
- [ ] Frontend landing page loads without errors

---

## 6. Authentication

- [ ] User registration works (email/password)
- [ ] User login works
- [ ] Google OAuth login works (if configured)
- [ ] Attempting to access a protected route without login redirects to login

---

## 7. Report Submission Flow (Phase 1 + Phase 2)

- [ ] Log in as a regular user
- [ ] Navigate to "Report Waste" or "Create Report"
- [ ] Upload a clear **waste** image (e.g., plastic bottle)
- [ ] Add a location and description
- [ ] Submit the report
- [ ] Check backend terminal logs — you should see:
  - Phase 1 call: `Calling http://localhost:8000/predict`
  - Phase 1 result: `label: trash, confidence: 0.xx`
  - Phase 2 call: `Calling http://localhost:8001/predict-category`
  - Phase 2 result: `predicted_class: plastic` (or similar)
- [ ] Report appears in the database / frontend
- [ ] Repeat with a **non-waste** image — the report should be rejected or flagged

---

## 8. Admin Review Queue

- [ ] Log in as an admin (set `role: admin` in MongoDB if needed)
- [ ] Navigate to Admin Dashboard → ML Review Queue
- [ ] Any low-confidence predictions should appear here for manual review
- [ ] Admin can approve or reject a pending report

---

## 9. Analytics Dashboard

- [ ] Navigate to Admin Dashboard → ML Analytics
- [ ] Dashboard loads without errors
- [ ] Prediction counts, confidence distributions, and review metrics are visible
- [ ] No blank/empty charts (requires at least a few submitted reports)

---

## 10. Final Docs Check

- [ ] [README.md](../README.md) — accurate and up to date
- [ ] [ML/README.md](../ML/README.md) — Phase 1 + Phase 2 both documented
- [ ] [docs/LOCAL_DEPLOYMENT.md](LOCAL_DEPLOYMENT.md) — setup commands are correct

---

## ⚠️ Common Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Phase 1 startup: `Warning: Binary model could not be loaded at startup: No module named 'tensorflow'` | Python 3.14 venv cannot install TensorFlow 2.15 wheel | Recreate `ML/venv` with Python 3.11: `py -3.11 -m venv venv`, then reinstall `requirements_service.txt` |
| ML service: `Model file not found` | Model not trained | Run `python -m training.train_binary_model` from `ML/` |
| Phase 2: `success: false` | `waste_category_classifier.pt` missing | Run `python -m ML.training.train_category_model` from project root |
| Backend: `MongoNetworkError` | MONGODB_URI wrong or Atlas IP not allowed | Check `Backend/.env` and Atlas network access |
| Frontend: Firebase auth error | Missing or wrong Firebase config | Verify all `VITE_FIREBASE_*` values |
| Port already in use | Previous server still running | `netstat -ano \| findstr :8000` then `taskkill /PID <PID> /F` |

---

*CleanSight — Building technology for cleaner, greener communities.*
