# Deploying ML Services to Hugging Face Spaces

This guide walks you through deploying both ML services — step by step.
No prior HF experience needed.

---

## What you'll end up with

| Space | URL (after deploy) | Service |
|---|---|---|
| `cleansight-ml-binary` | `https://YOUR_USERNAME-cleansight-ml-binary.hf.space` | Phase 1 – trash/non-trash |
| `cleansight-ml-category` | `https://YOUR_USERNAME-cleansight-ml-category.hf.space` | Phase 2 – plastic/paper/glass/mixed |

---

## Prerequisites

- A free account at https://huggingface.co
- Git installed on your machine
- Git LFS installed (for uploading model files)

Install Git LFS (one-time):
```bash
git lfs install
```

---

## Step 1 – Create the two Spaces on huggingface.co

Do this **twice** (once for each service).

1. Go to https://huggingface.co/new-space
2. Fill in:
   - **Owner**: your username
   - **Space name**: `cleansight-ml-binary` (first time) / `cleansight-ml-category` (second time)
   - **License**: MIT
   - **SDK**: **Docker** ← important!
   - **Visibility**: Public (free tier) or Private (requires Pro)
3. Click **Create Space**

You'll land on an empty Space with a default README. That's fine — we'll overwrite it.

---

## Step 2 – Clone the Space repositories

Run these commands on your machine (replace `YOUR_USERNAME`):

```bash
# Clone Space 1
git clone https://huggingface.co/spaces/YOUR_USERNAME/cleansight-ml-binary
cd cleansight-ml-binary
git lfs install
cd ..

# Clone Space 2
git clone https://huggingface.co/spaces/YOUR_USERNAME/cleansight-ml-category
cd cleansight-ml-category
git lfs install
cd ..
```

---

## Step 3 – Copy files into each Space repo

### Space 1 – Binary classifier

```bash
cd cleansight-ml-binary

# Copy the Dockerfile and requirements
cp /path/to/CleanSight/ML/hf_spaces/binary_service/Dockerfile .
cp /path/to/CleanSight/ML/hf_spaces/binary_service/requirements.txt .
cp /path/to/CleanSight/ML/hf_spaces/binary_service/README.md .

# Copy the entire ML source code
cp -r /path/to/CleanSight/ML/config        ./ML/config
cp -r /path/to/CleanSight/ML/inference     ./ML/inference
cp -r /path/to/CleanSight/ML/postprocessing ./ML/postprocessing
cp -r /path/to/CleanSight/ML/preprocessing ./ML/preprocessing
cp -r /path/to/CleanSight/ML/service       ./ML/service
cp    /path/to/CleanSight/ML/__init__.py   ./ML/__init__.py   2>/dev/null || true

# Copy the model files (tracked with Git LFS)
mkdir -p ML/models
git lfs track "ML/models/*.keras"
git lfs track "ML/models/*.json"
cp /path/to/CleanSight/ML/models/trash_classifier.keras    ML/models/
cp /path/to/CleanSight/ML/models/class_names.json          ML/models/
```

### Space 2 – Category classifier

```bash
cd ../cleansight-ml-category

cp /path/to/CleanSight/ML/hf_spaces/category_service/Dockerfile .
cp /path/to/CleanSight/ML/hf_spaces/category_service/requirements.txt .
cp /path/to/CleanSight/ML/hf_spaces/category_service/README.md .

cp -r /path/to/CleanSight/ML/config           ./ML/config
cp -r /path/to/CleanSight/ML/inference        ./ML/inference
cp -r /path/to/CleanSight/ML/postprocessing   ./ML/postprocessing
cp -r /path/to/CleanSight/ML/preprocessing    ./ML/preprocessing
cp -r /path/to/CleanSight/ML/service          ./ML/service
cp -r /path/to/CleanSight/ML/category_service ./ML/category_service
cp    /path/to/CleanSight/ML/__init__.py      ./ML/__init__.py 2>/dev/null || true

mkdir -p ML/models
git lfs track "ML/models/*.pt"
git lfs track "ML/models/*.json"
cp /path/to/CleanSight/ML/models/waste_category_classifier.pt  ML/models/
cp /path/to/CleanSight/ML/models/category_class_names.json      ML/models/
```

> **Windows note**: Replace `cp -r` with `xcopy /E /I` and adjust paths to use backslashes, or use Git Bash.

---

## Step 4 – Add `__init__.py` files so Python treats folders as packages

In **each** Space repo, create these empty files if they don't exist:

```bash
touch ML/__init__.py
touch ML/config/__init__.py
touch ML/inference/__init__.py
touch ML/postprocessing/__init__.py
touch ML/preprocessing/__init__.py
touch ML/service/__init__.py
touch ML/category_service/__init__.py   # Space 2 only
```

---

## Step 5 – Commit and push

### Space 1

```bash
cd cleansight-ml-binary
git add .
git commit -m "Deploy Phase 1 binary classifier"
git push
```

### Space 2

```bash
cd cleansight-ml-category
git add .
git commit -m "Deploy Phase 2 category classifier"
git push
```

After pushing, Hugging Face will automatically build the Docker image and start the container.
Build takes **5–10 minutes** on first push (it installs TensorFlow/PyTorch).

---

## Step 6 – Watch the build logs

1. Go to your Space URL: `https://huggingface.co/spaces/YOUR_USERNAME/cleansight-ml-binary`
2. Click the **"Logs"** tab (top right)
3. Wait until you see:
   ```
   Application startup complete.
   Uvicorn running on http://0.0.0.0:7860
   ```

If you see errors, check the **Build** tab first, then **App** tab.

---

## Step 7 – Test the live endpoints

Replace `YOUR_USERNAME` with your actual HF username:

```bash
# Health check – Phase 1
curl https://YOUR_USERNAME-cleansight-ml-binary.hf.space/health

# Expected: {"status":"ok","service":"binary-validation"}

# Health check – Phase 2
curl https://YOUR_USERNAME-cleansight-ml-category.hf.space/health

# Expected: {"status":"ok","service":"category-classification"}
```

You can also visit the interactive API docs:
- https://YOUR_USERNAME-cleansight-ml-binary.hf.space/docs
- https://YOUR_USERNAME-cleansight-ml-category.hf.space/docs

---

## Step 8 – Update your Render Backend environment variables

1. Go to https://dashboard.render.com
2. Open your **cleansight-backend** service
3. Go to **Environment** tab
4. Update these variables with your actual Space URLs:

| Key | Value |
|---|---|
| `ML_SERVICE_URL` | `https://YOUR_USERNAME-cleansight-ml-binary.hf.space` |
| `CATEGORY_ML_SERVICE_URL` | `https://YOUR_USERNAME-cleansight-ml-category.hf.space` |

5. Click **Save Changes** → Render will redeploy the backend automatically.

---

## Important Notes

### Cold Starts (Free Tier)
HF Spaces on the free tier **sleep after ~15 minutes of inactivity**.
The first request after sleep takes ~30 seconds while the container wakes up.
This is normal for free hosting.

**To prevent sleep**: Upgrade to a paid HF Space tier ($9/month), or set up a free uptime monitor at https://uptimerobot.com to ping `/health` every 10 minutes.

### Model file size
Your models are small (~9MB + ~4MB), well within HF's limits. Git LFS handles them fine.

### Logs
- Build logs: Space → **Build** tab
- Runtime logs: Space → **Logs** tab

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `ModuleNotFoundError: No module named 'ML'` | Make sure `PYTHONPATH=/app` is set in Dockerfile and `ML/__init__.py` exists |
| `Model not found at /app/ML/models/...` | Ensure model files were pushed with Git LFS (check with `git lfs ls-files`) |
| Build fails on `torch` install | The `--extra-index-url` in requirements.txt is required for CPU-only PyTorch |
| Space stays "Building" forever | Check the Build logs tab for errors |
| 503 on `/predict` | Model failed to load — check App logs for the specific error |
