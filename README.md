<div align="center">

# ♻️ CleanSight

**Report Waste. Coordinate Cleanup. Transform Communities.**

[![License: MIT](https://img.shields.io/badge/License-MIT-10b981.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61dafb.svg?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47a248.svg?logo=mongodb&logoColor=white)](https://mongodb.com)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.15-FF6F00.svg?logo=tensorflow&logoColor=white)](https://tensorflow.org)

CleanSight is a comprehensive data-driven platform empowering citizens to report garbage issues, volunteers to take action, and municipalities to efficiently manage cleanup operations. 

</div>

---

## 📖 About the Project

CleanSight was built to bridge the gap between environmental awareness and actionable community effort. By combining a modern web interface, a robust backend, and custom Machine Learning models, the platform streamlines the entire lifecycle of local waste management—from the moment a user snaps a photo to the final verified cleanup.

## ✨ Core Features

- **📸 AI-Powered Detection:** Integrated MobileNetV2 binary classifier to automatically verify uploaded images as waste/non-waste.
- **🔬 ML Category Classification:** PyTorch-based waste category classifier (glass, mixed, paper, plastic) with confidence-based auto-acceptance.
- **📊 ML Analytics Dashboard:** Comprehensive monitoring of ML model performance, prediction accuracy, review workload, and weak point identification for continuous improvement.
- **📍 Geolocation Tracking:** Precise GPS tagging for every report ensures cleanup crews know exactly where to go.
- **👥 Role-Based Workflows:** Distinct interfaces and permissions for Citizens, Volunteers, Staff, and Admins.
- **⚡ Real-Time Coordination:** Connects on-the-ground volunteers with reported tasks dynamically.
- **📈 Impact Analytics:** Comprehensive dashboards displaying environmental impact metrics and community progress.

## 🏗️ System Architecture

The project is structured as a monorepo containing three main modules:

```text
CleanSight/
├── Frontend/          # React + TypeScript SPA
│   ├── components/    # Reusable shadcn/ui components & layouts
│   ├── hooks/         # Custom React hooks (auth, analytics, queries)
│   ├── pages/         # Role-protected route views
│   └── lib/           # Firebase config, API clients, utilities
│
├── Backend/           # Node.js + Express REST API
│   ├── routes/        # API endpoints (auth, reports, volunteers)
│   ├── models/        # Mongoose/MongoDB schemas
│   ├── middleware/    # Firebase token verification & role guards
│   └── services/      # Business logic & analytics aggregations
│
└── ML/                # Machine Learning Environment
    ├── dataset_binary/# Waste vs. Non-waste image dataset
    ├── training/      # TensorFlow model training & fine-tuning pipelines
    ├── evaluation/    # Metric reporting (F1, confusion matrices)
    └── inference/     # Predict scripts for backend integration
```

## 🛠️ Tech Stack

**Frontend Frameworks & UI:**
- React 18, Vite, TypeScript
- Tailwind CSS, shadcn/ui, Framer Motion
- React Router v6

**Backend & Database:**
- Node.js, Express.js
- MongoDB, Mongoose
- RESTful HTTP architecture

**Machine Learning:**
- TensorFlow, Keras (MobileNetV2 Transfer Learning - Phase 1)
- PyTorch (Category Classification - Phase 2)
- Scikit-learn, Matplotlib, Seaborn, Pillow
- FastAPI ML Service

**Authentication & Security:**
- Firebase Authentication (OAuth & Email/Password)
- Firebase Admin SDK for backend token verification
- Custom Role-Based Access Control (RBAC) via database injection

## 🚀 Local Development

### Prerequisites
- **Node.js** 18+ and npm/pnpm
- **Python** 3.10+ (tested with 3.14)
- **MongoDB** (Atlas or local)
- **Git**

### Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd CleanSight
   pnpm install  # or npm install
   ```

2. **Configure environment variables:**
   ```bash
   # Frontend
   cd Frontend
   copy .env.example .env
   # Edit .env with your Firebase config
   
   # Backend
   cd ../Backend
   copy .env.example .env
   # Edit .env with MongoDB URI and Firebase Admin credentials
   
   # ML Service
   cd ../ML
   copy .env.example .env
   # Optional: customize ML service settings
   ```

3. **Set up Python environment (for ML Service):**
   ```bash
   cd ML
   python -m venv venv
   .\venv\Scripts\Activate.ps1  # Windows PowerShell
   pip install -r requirements_service.txt
   ```

4. **Start services** (in separate terminals):
   ```bash
   # Terminal 1: Backend
   cd Backend
   npm run dev
   # → http://localhost:5000
   
   # Terminal 2: ML Service
   cd ML
   .\venv\Scripts\Activate.ps1
   python -m uvicorn service.main:app --host 0.0.0.0 --port 8000 --reload
   # → http://localhost:8000
   
   # Terminal 3: Frontend
   cd Frontend
   npm run dev
   # → http://localhost:8080
   ```

5. **Verify deployment:**
   - Frontend: http://localhost:8080
   - Backend: http://localhost:5000/api/health (or check terminal output)
   - ML Service: http://localhost:8000/health

### Service Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 8080 | http://localhost:8080 |
| Backend | 5000 | http://localhost:5000 |
| ML Service | 8000 | http://localhost:8000 |

📖 **Full setup guide**: [docs/LOCAL_DEPLOYMENT.md](docs/LOCAL_DEPLOYMENT.md)

## 🚀 The Lifecycle of a Report

1. **Submission:** A user captures an image and tags the location on the map.
2. **AI Screening:** The ML model evaluates the image confidence score to filter out invalid or non-waste uploads.
3. **Dispatch:** The verified report appears on the localized community dashboard.
4. **Resolution:** Volunteers claim the task, execute the cleanup, and log completion.
5. **Review:** Administrators review the result and analytics reflect the community impact.

---

<div align="center">
  <p><strong>Developed by Sanuka Marasinghe</strong></p>
  <p>Building technology for cleaner, greener communities.</p>
</div>
