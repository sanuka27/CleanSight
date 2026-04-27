# CleanSight Local Deployment - Quick Reference

## 🚀 Quick Start (4 Steps)

### 1. Setup Environment Files
```bash
# Frontend
copy Frontend\.env.example Frontend\.env

# Backend
copy Backend\.env.example Backend\.env

# ML Service (optional)
copy ML\.env.example ML\.env
```
Then edit each `.env` file with your actual credentials.

### 2. Install Node Dependencies
```bash
npm install
# or
pnpm install
```

### 3. Setup Python Environment
```bash
cd ML
py -3.11 -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements_service.txt
cd ..
```

### 4. Start Services (3 Terminals)
```bash
# Terminal 1: Backend
cd Backend
npm run dev

# Terminal 2: ML Service
cd ML
.\venv\Scripts\Activate.ps1
python -m uvicorn service.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3: Frontend
cd Frontend
npm run dev
```

### Verify
Open http://localhost:8080 in your browser to access CleanSight.

Check service health:
- Frontend: http://localhost:8080
- Backend: http://localhost:5000/api/health
- ML Service: http://localhost:8000/health

---

## 📋 Service URLs

| Service | URL | Status Check |
|---------|-----|--------------|
| **Frontend** | http://localhost:8080 | Open in browser |
| **Backend** | http://localhost:5000 | http://localhost:5000/api/health |
| **ML Service** | http://localhost:8000 | http://localhost:8000/health |
| **ML Docs** | http://localhost:8000/docs | Interactive API docs |

---

## ⚙️ Required Configuration

### Frontend/.env
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_API_BASE_URL=http://localhost:5000
```

### Backend/.env
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/cleansight
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
ML_SERVICE_URL=http://localhost:8000
```

### ML/.env (Optional)
```env
ML_SERVICE_PORT=8000
BINARY_CONFIDENCE_THRESHOLD=0.85
CATEGORY_CONFIDENCE_THRESHOLD=0.85
```

---

## 🔧 Common Commands

### Start Individual Services
```bash
# Backend only
cd Backend && npm run dev

# ML Service only
cd ML && .\venv\Scripts\Activate.ps1 && python -m uvicorn service.main:app --reload --port 8000

# Frontend only
cd Frontend && npm run dev
```

### Check Service Health
Visit these URLs in your browser:
- Frontend: http://localhost:8080
- Backend API: http://localhost:5000/api/health
- ML Service: http://localhost:8000/health
- ML API Docs: http://localhost:8000/docs

### Stop All Services
Press `Ctrl+C` in each terminal window.

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Python not found" | Add Python to PATH, restart terminal |
| "Port already in use" | `netstat -ano \| findstr :5000` then `taskkill /PID <PID> /F` |
| "Scripts are disabled" | `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| "MongoDB connection failed" | Check MONGODB_URI in Backend/.env |
| "Firebase auth error" | Verify all Firebase config values in Frontend/.env |
| "ML model not found" | Train models: `python -m training.train_binary_model` |

---

## 📚 Full Documentation

- **Complete Setup Guide**: [docs/LOCAL_DEPLOYMENT.md](docs/LOCAL_DEPLOYMENT.md)
- **Branch Summary**: [DEPLOYMENT_BRANCH.md](DEPLOYMENT_BRANCH.md)
- **Project README**: [README.md](README.md)

---

## ✅ Pre-Launch Checklist

- [ ] All `.env` files configured with real values
- [ ] Node.js dependencies installed (`npm install`)
- [ ] Python virtual environment created and activated
- [ ] Python dependencies installed (`pip install -r requirements_service.txt`)
- [ ] MongoDB accessible (Atlas or local)
- [ ] Firebase project configured with Auth enabled
- [ ] ML models trained and available in `ML/models/`
- [ ] All three services start without errors
- [ ] Health check passes for all services
- [ ] Can register and log in via frontend
- [ ] Can submit a test report with image

---

## 🎯 Service Startup Order

**Important**: Start in this order for proper initialization:

1. **Backend** (depends on MongoDB) → Port 5000
2. **ML Service** (standalone) → Port 8000
3. **Frontend** (depends on Backend) → Port 8080

---

## 🔐 Security Notes

- ⚠️ **Never commit `.env` files** - they contain secrets
- ⚠️ **Use `.env.example` for templates only**
- ⚠️ **Change JWT_SECRET** before any production deployment
- ⚠️ **Rotate Firebase keys** if accidentally exposed
- ⚠️ **Use MongoDB Atlas IP whitelist** in production

---

## 🌐 Windows-Specific Notes

### PowerShell Execution Policy
```powershell
# Allow running local scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Virtual Environment Activation
```powershell
# PowerShell
.\venv\Scripts\Activate.ps1

# Command Prompt
.\venv\Scripts\activate.bat
```

### Finding Process on Port
```powershell
# Find process
netstat -ano | findstr :5000

# Kill process
taskkill /PID <PID> /F
```

---

## 📞 Getting Help

1. Check [docs/LOCAL_DEPLOYMENT.md](docs/LOCAL_DEPLOYMENT.md) for detailed troubleshooting
2. Review service logs in each terminal
3. Verify environment variables are set correctly
4. Ensure all prerequisites are installed
5. Manually verify services at their health endpoints

---

**Happy Deploying! 🚀**

*CleanSight - Building technology for cleaner, greener communities.*
