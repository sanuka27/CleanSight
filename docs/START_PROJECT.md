# CleanSight - Start the Project (Local)

This guide is the shortest path to running CleanSight locally on Windows.

For full setup details and troubleshooting, see:
- [LOCAL_DEPLOYMENT.md](LOCAL_DEPLOYMENT.md)
- [QUICK_START.md](../QUICK_START.md)

---

## Prerequisites (one-time)

- Node.js 18+ and npm or pnpm
- Python 3.11 (recommended for ML runtime on Windows)
- MongoDB (Atlas or local)
- Firebase project for auth

---

## One-time setup

### 1. Install dependencies

```powershell
# From repository root
pnpm install
# Or: npm install
```

### 2. Create environment files

```powershell
copy Frontend\.env.example Frontend\.env
copy Backend\.env.example Backend\.env
copy ML\.env.example ML\.env
```

Update each .env with real values (Firebase, MongoDB, service URLs).

### 3. Set up Python environment (ML)

```powershell
cd ML
py -3.11 -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements_service.txt
cd ..
```

---

## Start the services (4 terminals)

Start services in this order:

### Terminal 1 - Backend

```powershell
cd Backend
npm run dev
```

### Terminal 2 - ML Phase 1 (binary classifier)

```powershell
cd ML
.\venv\Scripts\Activate.ps1
python -m uvicorn service.main:app --host 0.0.0.0 --port 8000 --reload
```

### Terminal 3 - ML Phase 2 (category classifier)

```powershell
cd ML
.\venv\Scripts\Activate.ps1
python -m uvicorn category_service.main:app --host 0.0.0.0 --port 8001 --reload
```

### Terminal 4 - Frontend

```powershell
cd Frontend
pnpm dev
# Or: npm run dev
```

---

## Verify

Open http://localhost:8080

Health checks:
- http://localhost:5000/api/health
- http://localhost:8000/health
- http://localhost:8001/health

---

## Stop services

Press Ctrl+C in each terminal window.
