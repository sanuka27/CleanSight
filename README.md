<div align="center">

# ♻️ CleanSight

**Report Waste. Coordinate Cleanup. Transform Communities.**

[![License: MIT](https://img.shields.io/badge/License-MIT-10b981.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61dafb.svg?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47a248.svg?logo=mongodb&logoColor=white)](https://mongodb.com)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB.svg?logo=python&logoColor=white)](https://python.org)

CleanSight is a comprehensive data-driven platform empowering citizens to report garbage issues, volunteers to take action, and municipalities to efficiently manage cleanup operations.

</div>

---

## 📖 About the Project

CleanSight bridges the gap between environmental awareness and actionable community effort. By combining a modern web interface, a robust backend, and custom machine learning models, the platform streamlines the entire lifecycle of local waste management — from the moment a user snaps a photo to the final verified cleanup.

## ✨ Core Features

- **📸 Phase 1 AI Screening:** MobileNetV2 binary classifier (TensorFlow/Keras) automatically verifies uploaded images as waste or non-waste.
- **🔬 Phase 2 Category Classification:** MobileNetV3-Small classifier (PyTorch) identifies waste type — plastic, paper, glass, or mixed — for confirmed waste images.
- **📊 ML Analytics Dashboard:** Comprehensive monitoring of model performance, prediction confidence, review workload, and weak class identification.
- **📍 Geolocation Tracking:** Precise GPS tagging for every report so cleanup crews know exactly where to go.
- **👥 Role-Based Workflows:** Distinct interfaces and permissions for Citizens, Volunteers, Staff, and Admins.
- **🔄 Admin Review Queues:** Low-confidence ML predictions are flagged for human review before report acceptance.
- **⚡ Real-Time Coordination:** Connects on-the-ground volunteers with reported tasks dynamically.
- **📈 Impact Analytics:** Dashboards displaying environmental impact metrics and community progress.

## 🏗️ System Architecture

```text
CleanSight/
├── Frontend/               # React + TypeScript SPA (Vite)
│   ├── components/         # Reusable shadcn/ui components & layouts
│   ├── hooks/              # Custom React hooks (auth, analytics, queries)
│   ├── pages/              # Role-protected route views
│   └── lib/                # Firebase config, API clients, utilities
│
├── Backend/                # Node.js + Express REST API
│   ├── routes/             # API endpoints (auth, reports, volunteers, ML)
│   ├── models/             # Mongoose/MongoDB schemas
│   ├── middleware/         # Firebase token verification & role guards
│   └── services/           # Business logic & analytics aggregations
│
└── ML/                     # Machine Learning Environment
    ├── service/            # Phase 1 FastAPI service (port 8000)
    ├── category_service/   # Phase 2 FastAPI service (port 8001)
    ├── dataset_binary/     # Waste vs. non-waste image dataset
    ├── dataset_category/   # Category dataset (plastic/paper/glass/mixed)
    ├── training/           # Model training pipelines
    ├── evaluation/         # Metric reporting (F1, confusion matrices)
    ├── inference/          # Standalone predict scripts
    └── models/             # Trained model artifacts (git-ignored)
```

## 🛠️ Tech Stack

**Frontend:**
- React 18, Vite, TypeScript
- Tailwind CSS, shadcn/ui, Framer Motion
- React Router v6, Firebase Authentication

**Backend:**
- Node.js, Express.js
- MongoDB, Mongoose
- Firebase Admin SDK, Role-Based Access Control (RBAC)

**Machine Learning:**
- Phase 1: TensorFlow/Keras — MobileNetV2 binary classifier
- Phase 2: PyTorch — MobileNetV3-Small category classifier
- FastAPI for ML serving, Scikit-learn, Pillow, Matplotlib, Seaborn

## 🚀 Local Development

### Prerequisites

- **Node.js** 18+ and **pnpm** (or npm)
- **Python** 3.10+ (tested with 3.14 on Windows)
- **MongoDB** (Atlas cloud or local)
- **Git**

### 1. Clone and Install

```bash
git clone <repository-url>
cd CleanSight
pnpm install
```

### 2. Configure Environment Variables

```bash
# Frontend — add your Firebase config
copy Frontend\.env.example Frontend\.env

# Backend — add MongoDB URI + Firebase Admin credentials
copy Backend\.env.example Backend\.env

# ML Service — optional, uses sensible defaults
copy ML\.env.example ML\.env
```

Edit each `.env` with your real credentials. Never commit `.env` files.

### 3. Set Up Python Environment (ML Service)

```bash
cd ML
python -m venv venv
.\venv\Scripts\Activate.ps1       # Windows PowerShell
pip install -r requirements_service.txt
cd ..
```

### 4. Start Services (4 Terminals)

```bash
# Terminal 1 — Backend
cd Backend
npm run dev
# → http://localhost:5000

# Terminal 2 — ML Phase 1 Service (binary classifier)
cd ML
.\venv\Scripts\Activate.ps1
python -m uvicorn service.main:app --host 0.0.0.0 --port 8000 --reload
# → http://localhost:8000

# Terminal 3 — ML Phase 2 Category Service
cd ML
.\venv\Scripts\Activate.ps1
python -m uvicorn ML.category_service.main:app --host 0.0.0.0 --port 8001 --reload
# → http://localhost:8001

# Terminal 4 — Frontend
cd Frontend
pnpm dev
# → http://localhost:8080
```

### 5. Verify

| Service | URL | Health Check |
|---------|-----|-------------|
| Frontend | http://localhost:8080 | Opens CleanSight landing page |
| Backend | http://localhost:5000 | http://localhost:5000/api/health |
| ML Phase 1 | http://localhost:8000 | http://localhost:8000/health |
| ML Phase 2 | http://localhost:8001 | http://localhost:8001/health |

📖 **Full setup guide**: [docs/LOCAL_DEPLOYMENT.md](docs/LOCAL_DEPLOYMENT.md)
✅ **Pre-demo checklist**: [docs/QUICK_VERIFICATION_CHECKLIST.md](docs/QUICK_VERIFICATION_CHECKLIST.md)

## 🔄 The Lifecycle of a Report

1. **Submission:** A user captures an image and tags the location on the map.
2. **Phase 1 Screening:** The ML binary model determines whether the image contains waste. Non-waste images are rejected early.
3. **Phase 2 Classification:** Confirmed waste images are classified into a category (plastic, paper, glass, or mixed).
4. **Confidence Gating:** High-confidence predictions are auto-accepted; low-confidence ones are queued for admin review.
5. **Dispatch:** Verified reports appear on the community dashboard for volunteers to claim.
6. **Resolution:** Volunteers execute the cleanup and log completion.
7. **Review & Analytics:** Admins review outcomes; the analytics dashboard tracks community impact and model performance.

---

<div align="center">
  <p><strong>Developed by Sanuka Marasinghe</strong></p>
  <p>Building technology for cleaner, greener communities.</p>
</div>
