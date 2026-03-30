# CleanSight - Local Deployment Guide

This guide will help you set up and run the complete CleanSight platform locally on your Windows machine without Docker. The platform consists of three services: Frontend (React + Vite), Backend (Express.js + MongoDB), and ML Service (FastAPI).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Repository Setup](#repository-setup)
3. [Service Configuration](#service-configuration)
4. [Database Setup](#database-setup)
5. [ML Model Setup](#ml-model-setup)
6. [Starting the Services](#starting-the-services)
7. [Verifying the Deployment](#verifying-the-deployment)
8. [Testing the Integration](#testing-the-integration)
9. [Troubleshooting](#troubleshooting)
10. [Development Workflow](#development-workflow)

---

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** or **pnpm** (comes with Node.js)
   - Verify installation: `npm --version`
   - Optional: Install pnpm: `npm install -g pnpm`

3. **Python** (3.10 or higher, tested with 3.14)
   - Download from: https://www.python.org/downloads/
   - ⚠️ **Important**: Check "Add Python to PATH" during installation
   - Verify installation: `python --version`

4. **MongoDB**
   - **Option A**: MongoDB Atlas (Cloud - Recommended for development)
     - Sign up at: https://www.mongodb.com/cloud/atlas
     - Create a free cluster
     - Get your connection string
   
   - **Option B**: MongoDB Community Edition (Local)
     - Download from: https://www.mongodb.com/try/download/community
     - Install and start the MongoDB service
     - Default connection: `mongodb://localhost:27017`

5. **Git**
   - Download from: https://git-scm.com/download/win
   - Verify installation: `git --version`

### Firebase Project Setup

CleanSight uses Firebase for authentication. You'll need to set up a Firebase project:

1. Go to: https://console.firebase.google.com/
2. Create a new project (or use an existing one)
3. Enable Authentication → Email/Password and Google OAuth
4. Go to Project Settings → General → Your apps
5. Create a Web App and copy the configuration values
6. Go to Project Settings → Service Accounts
7. Click "Generate new private key" for backend authentication

---

## Repository Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd CleanSight
```

### 2. Checkout the Deployment Config Branch

```bash
git checkout feature/ml-deployment-config
```

### 3. Install Dependencies

**Option A: Using pnpm (recommended)**
```bash
pnpm install
```

**Option B: Using npm**
```bash
npm install
cd Frontend
npm install
cd ../Backend
npm install
cd ..
```

---

## Service Configuration

### 1. Frontend Configuration

Create `Frontend/.env` from the example:

```bash
cd Frontend
copy .env.example .env
```

Edit `Frontend/.env` with your Firebase configuration:

```env
# Firebase Configuration (from Firebase Console)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Backend API URL
VITE_API_BASE_URL=http://localhost:5000
```

### 2. Backend Configuration

Create `Backend/.env` from the example:

```bash
cd Backend
copy .env.example .env
```

Edit `Backend/.env`:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# MongoDB Connection
# Option A: MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cleansight?retryWrites=true&w=majority

# Option B: Local MongoDB
# MONGODB_URI=mongodb://localhost:27017/cleansight

# Firebase Admin SDK (from Firebase Console → Service Accounts)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_private_key_here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this

# CORS Configuration
CLIENT_URL=http://localhost:8080

# ML Service Configuration
ML_SERVICE_URL=http://localhost:8000
ML_SERVICE_TIMEOUT_MS=10000
```

⚠️ **Important**: 
- Replace all placeholder values with your actual Firebase credentials
- Keep the `\n` characters in the private key as-is
- Never commit your `.env` files to version control

### 3. ML Service Configuration

Create `ML/.env` (optional - uses defaults if not present):

```bash
cd ML
copy .env.example .env
```

Edit `ML/.env` (optional customization):

```env
ML_SERVICE_HOST=0.0.0.0
ML_SERVICE_PORT=8000

BINARY_MODEL_PATH=models/trash_classifier.keras
CATEGORY_MODEL_PATH=models/category_classifier.pth

BINARY_CONFIDENCE_THRESHOLD=0.85
CATEGORY_CONFIDENCE_THRESHOLD=0.85

PREDICTION_TIMEOUT_MS=5000
LOG_LEVEL=INFO
```

---

## Database Setup

### Option A: MongoDB Atlas (Recommended)

1. Log in to MongoDB Atlas: https://cloud.mongodb.com/
2. Create a new cluster (free tier available)
3. Create a database user:
   - Database Access → Add New Database User
   - Set username and password
4. Allow network access:
   - Network Access → Add IP Address → Allow Access from Anywhere (for development)
5. Get connection string:
   - Clusters → Connect → Connect your application
   - Copy the connection string
   - Replace `<password>` with your database user password
6. Paste the connection string into `Backend/.env` as `MONGODB_URI`

### Option B: Local MongoDB

1. Install MongoDB Community Edition
2. Start MongoDB service:
   ```bash
   net start MongoDB
   ```
3. Use connection string: `mongodb://localhost:27017/cleansight`

The database schema will be created automatically when the backend starts.

---

## ML Model Setup

The ML service requires trained models to function. If models don't exist yet:

### 1. Create Python Virtual Environment

```bash
cd ML
python -m venv venv
```

### 2. Activate Virtual Environment

```bash
# Windows PowerShell
.\venv\Scripts\Activate.ps1

# Windows Command Prompt
.\venv\Scripts\activate.bat
```

### 3. Install ML Dependencies

```bash
# For training models (Phase 1 & 2)
pip install -r requirements.txt

# For running the ML service
pip install -r requirements_service.txt
```

### 4. Train Models (if needed)

**Phase 1: Binary Classifier (Trash vs Non-Trash)**
```bash
python -m training.train_binary_model
```
This creates: `ML/models/trash_classifier.keras`

**Phase 2: Category Classifier (Plastic, Paper, Glass, Mixed)**
```bash
python -m training.train_category_model
```
This creates: `ML/models/category_classifier.pth`

⚠️ **Note**: Training requires datasets in `ML/dataset_binary/` and `ML/dataset_category/`. If you don't have datasets, the ML service will return mock predictions or errors.

---

## Starting the Services

**Important**: Services must be started in this order:
1. Backend (depends on MongoDB)
2. ML Service (depends on trained models)
3. Frontend (depends on Backend)

### Manual Start (Recommended for Development)

Open **three separate terminal windows**:

**Terminal 1 - Backend:**
```bash
cd Backend
npm run dev
```
Expected output: `Server running on http://localhost:5000`

**Terminal 2 - ML Service:**
```bash
cd ML
# Activate venv if not already activated
.\venv\Scripts\Activate.ps1
python -m uvicorn service.main:app --host 0.0.0.0 --port 8000 --reload
```
Expected output: `Uvicorn running on http://0.0.0.0:8000`

**Terminal 3 - Frontend:**
```bash
cd Frontend
npm run dev
```
Expected output: `Local: http://localhost:8080/`

---

## Verifying the Deployment

### Check Service Health

Manually check each service:

1. **Frontend**: Open http://localhost:8080 in your browser
   - Should see the CleanSight landing page

2. **Backend**: Visit http://localhost:5000/api/health
   - Should return: `{"status":"ok"}`

3. **ML Service**: Visit http://localhost:8000/health
   - Should return: `{"status":"ok"}`
   - API docs: http://localhost:8000/docs

### Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:8080 | Main web interface |
| Backend | http://localhost:5000 | REST API |
| ML Service | http://localhost:8000 | ML predictions |
| ML API Docs | http://localhost:8000/docs | Interactive API documentation |

---

## Testing the Integration

### 1. User Registration and Login

1. Open http://localhost:8080
2. Click "Sign Up" or "Get Started"
3. Create an account with email/password or Google OAuth
4. Log in to verify authentication works

### 2. Submit a Test Report

1. Log in as a regular user
2. Navigate to "Create Report" or "Report Waste"
3. Upload an image (any image for testing)
4. Add location and description
5. Submit the report

**What happens:**
- Frontend sends image to Backend
- Backend forwards image to ML Service at `http://localhost:8000/predict`
- ML Service returns prediction (trash/non-trash, confidence score)
- Backend stores report in MongoDB
- Frontend displays confirmation

### 3. Check ML Analytics (Admin)

1. Log in as an admin user (set role in MongoDB)
2. Navigate to Admin Dashboard → ML Analytics
3. View prediction statistics, confidence distributions, review metrics

### 4. Verify Service Communication

Check backend logs for ML service calls:
```
[ML Service] Calling http://localhost:8000/predict
[ML Service] Response: {"label":"trash","confidence":0.92}
```

---

## Troubleshooting

### Common Windows-Specific Issues

This section covers issues specific to running CleanSight on Windows. For general troubleshooting, see the sections below.

#### Quick Windows Setup Checklist

Before troubleshooting, verify:
- [ ] Python is in PATH (test: `python --version`)
- [ ] Node.js and npm are in PATH (test: `node --version`)
- [ ] Git is installed (test: `git --version`)
- [ ] PowerShell execution policy allows scripts
- [ ] All `.env` files are created from `.env.example`
- [ ] Ports 5000, 8000, 8080 are not in use
- [ ] Antivirus/firewall isn't blocking node.exe or python.exe

### PowerShell Execution Policy Error

**Error**: "cannot be loaded because running scripts is disabled"

**Solution**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Explanation**: Windows blocks unsigned PowerShell scripts by default for security. This command allows locally created scripts to run while still requiring remote scripts to be signed.

### Port Already in Use

**Error**: "Port 5000/8000/8080 is already in use"

**Windows-Specific Solution**:
```powershell
# Find which process is using the port
netstat -ano | findstr :5000

# Kill the process (replace <PID> with the actual process ID from the netstat output)
taskkill /PID <PID> /F

# Example: If PID is 12345
taskkill /PID 12345 /F
```

**Alternative**: Change the port in the respective `.env` file and restart the service.

### Python Virtual Environment Activation Issues

**Issue**: Virtual environment activation script not found or fails

**Windows PowerShell Solution**:
```powershell
cd ML
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**Windows Command Prompt Solution**:
```cmd
cd ML
python -m venv venv
.\venv\Scripts\activate.bat
```

**If activation still fails**:
```powershell
# Check if Python venv module is available
python -m venv --help

# Reinstall Python with venv support if needed
# Or use virtualenv as an alternative:
pip install virtualenv
virtualenv venv
.\venv\Scripts\Activate.ps1
```

### MongoDB Connection Failed

**Error**: "MongoNetworkError: failed to connect to server"

**Solutions**:
- **MongoDB Atlas**: Check network access settings, verify connection string, check username/password
- **Local MongoDB**: Ensure MongoDB service is running: `net start MongoDB`
- Verify `MONGODB_URI` in `Backend/.env` is correct

### ML Service Import Errors

**Error**: "ModuleNotFoundError: No module named 'fastapi'"

**Solution**:
```bash
cd ML
.\venv\Scripts\Activate.ps1
pip install -r requirements_service.txt
```

### Firebase Authentication Error

**Error**: "Firebase: Error (auth/invalid-api-key)"

**Solutions**:
- Verify all Firebase config values in `Frontend/.env`
- Ensure Firebase project has Email/Password and Google OAuth enabled
- Check that the API key matches your Firebase project

### Model Not Found Error

**Error**: "Model file not found: models/trash_classifier.keras"

**Solution**:
```bash
cd ML
.\venv\Scripts\Activate.ps1
python -m training.train_binary_model
```

### CORS Error

**Error**: "Access to XMLHttpRequest blocked by CORS policy"

**Solutions**:
- Verify `CLIENT_URL=http://localhost:8080` in `Backend/.env`
- Verify `VITE_API_BASE_URL=http://localhost:5000` in `Frontend/.env`
- Restart the backend service after changing environment variables

### Python Not Found

**Error**: "'python' is not recognized"

**Windows Solutions**:

1. **Add Python to PATH manually**:
   - Right-click "This PC" → Properties → Advanced System Settings
   - Click "Environment Variables"
   - Under "System Variables", find "Path" and click "Edit"
   - Click "New" and add your Python installation directory (e.g., `C:\Python310`)
   - Add another entry for Scripts directory (e.g., `C:\Python310\Scripts`)
   - Click OK and restart your terminal

2. **Verify Python installation location**:
   ```cmd
   where python
   ```
   If nothing appears, Python is not in PATH

3. **Reinstall Python**:
   - Download from https://www.python.org/downloads/
   - ⚠️ **IMPORTANT**: Check "Add Python to PATH" during installation
   - Restart terminal after installation

4. **Use py launcher** (comes with Python on Windows):
   ```cmd
   py --version
   py -m venv venv
   ```

### Node.js or npm Not Found

**Error**: "'node' is not recognized" or "'npm' is not recognized"

**Windows Solution**:
1. Download Node.js from https://nodejs.org/
2. Run the installer (LTS version recommended)
3. Restart your terminal
4. Verify: `node --version` and `npm --version`

### Git Line Ending Issues

**Issue**: Files have wrong line endings after cloning on Windows

**Solution**:
```bash
# Configure Git to handle line endings automatically
git config --global core.autocrlf true

# Re-clone the repository or reset line endings
git rm --cached -r .
git reset --hard
```

### MongoDB Windows Service Issues

**Error**: "MongoDB service won't start" or "net start MongoDB failed"

**Windows Solutions**:

1. **Check if MongoDB is installed as a service**:
   ```cmd
   sc query MongoDB
   ```

2. **Start MongoDB service manually**:
   ```cmd
   # Run as Administrator
   net start MongoDB
   ```

3. **If service doesn't exist, run MongoDB manually**:
   ```cmd
   "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath="C:\data\db"
   ```

4. **Install MongoDB as a Windows service**:
   ```cmd
   # Run as Administrator
   "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --install --serviceName MongoDB --dbpath="C:\data\db" --logpath="C:\data\log\mongodb.log"
   ```

5. **Use MongoDB Atlas instead** (recommended for development):
   - No local installation needed
   - See "Database Setup → Option A: MongoDB Atlas" section

### File Permission Errors

**Error**: "Access denied" when creating files or directories

**Solution**:
```powershell
# Run PowerShell as Administrator
# Right-click PowerShell → "Run as Administrator"

# Or change directory permissions
icacls "C:\Users\sanuk\OneDrive\Desktop\projects\CleanSight" /grant:r "%USERNAME%:(OI)(CI)F" /T
```

### Firewall Blocking Ports

**Issue**: Services start but can't be accessed

**Windows Firewall Solution**:
1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. Enter ports: 5000, 8000, 8080
6. Allow the connection
7. Apply to all profiles
8. Name it "CleanSight Development Ports"

Or temporarily disable firewall for testing (not recommended for production).

### npm Install Fails on Windows

**Error**: "gyp ERR!" or compilation errors during npm install

**Solutions**:

1. **Install Windows Build Tools**:
   ```cmd
   npm install --global windows-build-tools
   ```
   Note: This may take 10-15 minutes

2. **Install Visual Studio Build Tools manually**:
   - Download from: https://visualstudio.microsoft.com/downloads/
   - Install "Desktop development with C++" workload

3. **Use alternative package manager**:
   ```cmd
   npm install -g pnpm
   pnpm install
   ```

### Python Package Installation Fails

**Error**: "Microsoft Visual C++ 14.0 is required"

**Solution**:
1. Download Visual Studio Build Tools: https://visualstudio.microsoft.com/downloads/
2. Install "Desktop development with C++"
3. Restart terminal
4. Try `pip install` again

**Alternative**: Use pre-built wheels:
```cmd
pip install --only-binary :all: <package-name>
```

---

## Development Workflow

### Daily Development

1. **Start services** (in order):
   ```bash
   # Terminal 1: Backend
   cd Backend && npm run dev
   
   # Terminal 2: ML Service
   cd ML && .\venv\Scripts\Activate.ps1 && python -m uvicorn service.main:app --reload --port 8000
   
   # Terminal 3: Frontend
   cd Frontend && npm run dev
   ```

2. **Make changes** to your code
   - Frontend: Changes auto-reload via Vite HMR
   - Backend: Changes auto-reload via nodemon
   - ML Service: Changes auto-reload via uvicorn `--reload`

3. **Test changes** in the browser at http://localhost:8080

4. **Stop services**: Press `Ctrl+C` in each terminal

### Production-Like Local Testing

```bash
# Build frontend
cd Frontend
npm run build

# Serve frontend build (install serve globally first: npm i -g serve)
serve -s dist -l 8080

# Start backend in production mode
cd Backend
npm start

# Start ML service without reload
cd ML
python -m uvicorn service.main:app --host 0.0.0.0 --port 8000
```

### Updating Dependencies

```bash
# Frontend
cd Frontend
npm update

# Backend
cd Backend
npm update

# ML Service
cd ML
pip list --outdated
pip install -U <package-name>
```

---

## Port Reference

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Frontend | 8080 | HTTP | Vite dev server |
| Backend | 5000 | HTTP | Express.js API |
| ML Service | 8000 | HTTP | FastAPI ML predictions |
| MongoDB Local | 27017 | TCP | MongoDB database (if running locally) |

---

## Next Steps

After successful local deployment:

1. **Customize the platform**:
   - Update branding and colors
   - Modify report categories
   - Adjust ML confidence thresholds

2. **Add more features**:
   - Email notifications
   - Report analytics
   - Gamification and badges

3. **Prepare for demo**:
   - Seed database with sample data
   - Create test user accounts
   - Prepare presentation materials

4. **Plan production deployment**:
   - Choose hosting provider (AWS, Azure, DigitalOcean, etc.)
   - Set up CI/CD pipeline
   - Configure production environment variables
   - Set up monitoring and logging

---

## Additional Resources

- **Frontend Documentation**: `Frontend/README.md`
- **Backend API Documentation**: `docs/DASHBOARD_API.md`
- **ML Module Documentation**: `ML/README.md`
- **Analytics API**: `docs/ANALYTICS_API.md`
- **ML Admin Review Flow**: `docs/ML_ADMIN_REVIEW_FLOW.md`

---

## Support

If you encounter issues not covered in this guide:

1. Check the GitHub Issues page
2. Review the troubleshooting section
3. Check service logs for detailed error messages
4. Verify all prerequisites are properly installed
5. Ensure all environment variables are correctly configured

---

**Happy Developing! 🚀**

*CleanSight - Building technology for cleaner, greener communities.*
