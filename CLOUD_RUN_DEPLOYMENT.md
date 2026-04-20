# 🚀 Cloud Run Deployment Guide - Frontend + Backend Fix

## Masalah yang ditemukan & sudah di-fix:

### ❌ Problem: API Endpoint Hardcoded
**Sebelumnya:**
```javascript
// api.js - Hardcoded ke Render!
const baseURL = 'https://render-anti-gravity.onrender.com/api'
```

**Solusi:** 
- ✅ Sekarang support environment variable `VITE_API_URL`
- ✅ Fallback ke relative URL `/api` dengan nginx proxy
- ✅ Development mode tetap localhost:8000

---

## 📋 Pre-Deployment Checklist

- [x] Backend: Neon database sudah set
- [x] Backend: Hardcoded API keys sudah di-remove
- [x] Frontend: API endpoint sudah dinamis
- [x] Frontend: nginx.conf sudah support proxy
- [ ] Cloud Run: Set environment variables

---

## 🚀 Deployment ke Cloud Run (Updated)

### Step 1: Update docker-compose.yml (untuk local testing)

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: antigravity-backend
    environment:
      - DATABASE_URL=postgresql://neondb_owner:npg_e1Jl3rWoTcAR@ep-withered-butterfly-ao66aczs-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
      - JWT_SECRET=freemir_antigravity_2026_prod_secret
    restart: unless-stopped
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend
    container_name: antigravity-frontend
    ports:
      - "80:8080"
    environment:
      - VITE_API_URL=http://localhost:8000/api
    depends_on:
      - backend
    restart: unless-stopped
```

### Step 2: Push ke GitHub

```bash
git add .
git commit -m "fix: make frontend API endpoint dynamic for Cloud Run"
git push origin main
```

This triggers Cloud Build automatically (if webhook is set up).

---

## ☁️ Cloud Run Environment Variables

### Backend Service (anti-gravity)

```
KEY                  VALUE
DATABASE_URL        postgresql://neondb_owner:npg_e1Jl3rWoTcAR@ep-withered-butterfly-ao66aczs-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET          freemir_antigravity_2026_prod_secret
GEMINI_API_KEY      (optional)
```

**Deploy:**
```bash
gcloud run deploy anti-gravity \
  --source backend \
  --region asia-southeast1 \
  --set-env-vars DATABASE_URL="...",JWT_SECRET="..." \
  --allow-unauthenticated \
  --quiet
```

### Frontend Service (frontend-anti-gravity)

```
KEY              VALUE
VITE_API_URL    https://anti-gravity-XXXXX.asia-southeast1.run.app/api
```

⚠️ **IMPORTANT:** Replace `anti-gravity-XXXXX` dengan actual backend Cloud Run URL!

**Deploy:**
```bash
gcloud run deploy frontend-anti-gravity \
  --source frontend \
  --region asia-southeast1 \
  --set-env-vars VITE_API_URL="https://anti-gravity-XXXXX.asia-southeast1.run.app/api" \
  --allow-unauthenticated \
  --quiet
```

---

## 🔄 How It Works Now

### Development (localhost)
```
Frontend (5173) → Backend (8000/api) ✓
```

### Production (Cloud Run)
```
Option 1: Direct URL
Frontend (Cloud Run) → Backend (Cloud Run via VITE_API_URL env var) ✓

Option 2: Relative URL + Nginx Proxy
Frontend (Cloud Run) → /api (nginx proxy) → Backend (Cloud Run) ✓
```

---

## 🧪 Testing

### Local:
```bash
# Terminal 1: Backend
cd backend
export DATABASE_URL="postgresql://..."
python -m uvicorn main:app --reload

# Terminal 2: Frontend
cd frontend
npm run dev

# Browser: http://localhost:5173
```

### Production:
1. Deploy both services to Cloud Run
2. Set VITE_API_URL in frontend service
3. Test: https://frontend-anti-gravity-XXXXX.asia-southeast1.run.app

---

## 🐛 Troubleshooting

### Frontend shows "Connection Refused" error

**Cause:** Frontend can't reach backend API

**Solution:**
1. Verify VITE_API_URL is set correctly
2. Check if backend service is running and healthy
3. Verify CORS is enabled in backend (should be * in main.py)

### API requests timeout

**Cause:** Cold start or backend not responding

**Solution:**
1. Increase Cloud Run timeout setting
2. Set min-instances=1 to avoid cold starts
3. Check Cloud Run logs for errors

### Build fails on Cloud Build

**Cause:** Missing environment variables or npm dependencies

**Solution:**
1. Check cloudbuild.yaml has build args
2. Run `npm ci` instead of `npm install` for reproducible builds
3. Check package.json for missing dependencies

---

## 📚 Reference

- **Cloud Run Docs**: https://cloud.google.com/run/docs
- **Frontend API Setup**: frontend/src/api.js
- **Backend Config**: backend/database.py
- **Nginx Config**: frontend/nginx.conf

---

## ✅ Deployment Checklist (New)

- [ ] Backend DATABASE_URL set in Cloud Run
- [ ] Backend JWT_SECRET set in Cloud Run
- [ ] Frontend VITE_API_URL set in Cloud Run
- [ ] Frontend image rebuilt (npm run build)
- [ ] Both services deployed successfully
- [ ] Login page loads
- [ ] Can login with valid credentials
- [ ] API endpoints respond correctly
- [ ] Check Cloud Run logs for errors

