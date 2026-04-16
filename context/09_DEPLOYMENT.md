# 9. DEPLOYMENT & CI/CD

## 🚀 Production Deployment Overview

**Platform:** Google Cloud Run  
**Region:** asia-southeast1-c  
**Status:** ✅ Active  
**Build System:** Cloud Build  
**Container Registry:** Google Artifact Registry

---

## 🏗️ Deployment Architecture

```
GitHub (Source Code)
    │
    ├─→ [Webhook] Trigger on push to main
    │
    ▼
Cloud Build
    ├─→ Build Docker image
    ├─→ Run tests
    ├─→ Push to Artifact Registry
    │
    ▼
Google Artifact Registry
    ├─→ Store container image
    │
    ▼
Cloud Run
    ├─→ Deploy container
    ├─→ Auto-scale (0 to N instances)
    ├─→ Expose via HTTPS
    │
    ▼
Public API (https://api.antigravity.cloud)
    │
    └─→ Connected to DB (34.126.76.58:5432)
```

---

## 📦 Docker Configuration

### Dockerfile

```dockerfile
# Multi-stage build for optimization

# Stage 1: Build
FROM python:3.11-slim as builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY backend/requirements.txt .

# Install Python packages
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /root/.local /root/.local
COPY backend/ .

# Set environment path
ENV PATH=/root/.local/bin:$PATH

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/api/health')"

# Run
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Build Process

```bash
# Local testing before push
docker build -t antigravity:latest -f Dockerfile .
docker run -p 8000:8000 antigravity:latest

# Cloud Build (automatic on git push)
gcloud builds submit --config=cloudbuild.yaml
```

---

## 🔨 Cloud Build Configuration

### cloudbuild.yaml

```yaml
steps:
  # Step 1: Build backend Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'asia-southeast1-docker.pkg.dev/$PROJECT_ID/antigravity/backend:$SHORT_SHA'
      - '-f'
      - 'Dockerfile'
      - '.'
    id: 'build-backend'

  # Step 2: Push to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'asia-southeast1-docker.pkg.dev/$PROJECT_ID/antigravity/backend:$SHORT_SHA'
    id: 'push-backend'

  # Step 3: Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
      - 'run'
      - '--filename=k8s/'
      - '--image=asia-southeast1-docker.pkg.dev/$PROJECT_ID/antigravity/backend:$SHORT_SHA'
      - '--location=asia-southeast1-c'
      - '--cluster=default'
    id: 'deploy'

# Alternative: Direct Cloud Run deployment (simpler)
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
      - 'run'
      - '--service=anti-gravity'
      - '--image=asia-southeast1-docker.pkg.dev/$PROJECT_ID/antigravity/backend:$SHORT_SHA'
      - '--region=asia-southeast1-c'
    id: 'deploy-run'

timeout: '1800s'  # 30 minutes max
tags:
  - 'gcp-cloud'
  - 'antigravity'
```

### Trigger Setup

1. **GitHub Integration** (in Cloud Build)
   ```
   Connected Repository: dachin-ai/anti-gravity
   Branch Pattern: ^main$
   Trigger Name: antigravity-deploy
   ```

2. **Manual Trigger**
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```

---

## 🌐 Cloud Run Service Configuration

### Service Settings

```yaml
Service: anti-gravity
Region: asia-southeast1-c
Memory: 512 MB (adjustable)
CPU: 1 (adjustable)
Timeout: 300 seconds
Concurrency: 80 (per instance)
Min Instances: 0 (scale to zero)
Max Instances: 10 (prevents runaway costs)
```

### Command to Update

```bash
# Deploy via gcloud
gcloud run deploy anti-gravity \
  --image asia-southeast1-docker.pkg.dev/PROJECT_ID/antigravity/backend:latest \
  --region asia-southeast1-c \
  --platform managed \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --concurrency 80 \
  --min-instances 0 \
  --max-instances 10 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=...,JWT_SECRET=..."
```

---

## 🔐 Environment Variables in Cloud Run

### Set Environment Variables

Option 1: Via gcloud command
```bash
gcloud run services update anti-gravity \
  --set-env-vars "KEY1=value1,KEY2=value2" \
  --region asia-southeast1-c
```

Option 2: Via Cloud Console
```
Cloud Run → select service → Edit & Deploy
→ Environment variables section
```

Option 3: Via Secret Manager (Recommended)
```bash
# Create secret
gcloud secrets create db-password --data-file=-

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding db-password \
  --member serviceAccount:PROJECT@iam.gserviceaccount.com \
  --role roles/secretmanager.secretAccessor

# Use in Cloud Run
gcloud run deploy anti-gravity \
  --set-env-vars "DATABASE_PASSWORD=projects/PROJECT/secrets/db-password/versions/latest"
```

---

## 📊 Monitoring & Logging

### Cloud Logging

```bash
# View recent logs
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=anti-gravity" \
  --limit 50 \
  --format json

# Filter errors
gcloud logging read \
  "severity=ERROR AND resource.type=cloud_run_revision" \
  --limit 10

# In Cloud Console:
# Cloud Run → anti-gravity → Logs
```

### Cloud Monitoring

```bash
# View metrics
gcloud monitoring time-series list \
  --filter 'metric.type=run.googleapis.com/request_count'

# In Cloud Console:
# Monitoring → Dashboards → Create dashboard
# Add metrics:
# - Cloud Run request count
# - Cloud Run request latencies
# - Cloud Run error rate
```

---

## 🔄 Rollback Procedure

### If Deployment Fails

```bash
# Check available revisions
gcloud run revisions list --service anti-gravity

# Rollback to previous version
gcloud run deploy anti-gravity \
  --image asia-southeast1-docker.pkg.dev/PROJECT_ID/antigravity/backend:PREVIOUS_TAG \
  --revision-suffix=rollback

# Or manually via Cloud Console:
# Cloud Run → anti-gravity → Revisions → Select previous → Set Traffic
```

---

## 🧪 Pre-Deployment Testing

### Local Testing

```bash
# 1. Build locally
docker build -t antigravity:test .

# 2. Run container locally
docker run -p 8000:8000 \
  -e DATABASE_URL="..." \
  -e JWT_SECRET="..." \
  antigravity:test

# 3. Test endpoints
curl http://localhost:8000/api/health
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

### Smoke Tests

```bash
#!/bin/bash
# test-smoke.sh

API_URL="https://api.antigravity.cloud"

# Test 1: Health check
echo "Testing health endpoint..."
curl -s $API_URL/api/health | grep -q "healthy" && echo "✓ Health OK"

# Test 2: Database connection
echo "Testing database connection..."
curl -s -X GET $API_URL/api/stats \
  -H "Authorization: Bearer $TEST_TOKEN" | grep -q "total_users" && echo "✓ DB OK"

# Test 3: Login endpoint
echo "Testing login..."
curl -s -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' | grep -q "access_token" && echo "✓ Login OK"

echo "All smoke tests passed!"
```

---

## 📈 Auto-Scaling Configuration

### Scaling Policy

```yaml
Min Instances: 0      # Scale to zero when idle (cost savings)
Max Instances: 10     # Prevent runaway
Concurrency: 80 per instance

Scaling Math:
  If 1000 concurrent users arrive:
  1000 ÷ 80 = 12.5 → Round up to 13 instances
  (Capped at max 10) → Use all 10 + reject excess
```

### Cost Optimization

```
Scenario 1: Low Traffic (1 request/minute)
├─ Instances: 0 (scaled to zero)
├─ Cost: ~$0
└─ Note: Cold start ~2-3 seconds

Scenario 2: Peak Traffic (500 concurrent)
├─ Instances: Min 1, likely 6-8
├─ Cost: ~$30-40/month
└─ Note: Auto-scaled up on demand

Scenario 3: Sustained High Traffic (1000+ concurrent)
├─ Instances: 10 (max)
├─ Cost: ~$50-60/month
└─ Note: Additional traffic queued or rejected
```

---

## 🚨 Deployment Checklist

### Pre-Deployment

- [ ] All code tested locally
- [ ] All tests passing
- [ ] No SQL migrations needed (or pre-tested)
- [ ] Environment variables configured
- [ ] Database backups taken
- [ ] Feature flags ready (if gradual rollout needed)

### During Deployment

- [ ] Monitor Cloud Build logs (no errors)
- [ ] Check Cloud Run revision deployed
- [ ] Test health endpoint responding
- [ ] Monitor logs for errors (first 5 min)

### Post-Deployment

- [ ] Run smoke tests
- [ ] Check metrics (latency, error rate)
- [ ] User acceptance testing
- [ ] Monitor for 24 hours
- [ ] Document in changelog

---

## 📚 Related Files

- [ENVIRONMENT.md](10_ENVIRONMENT.md) - Environment configuration
- [ARCHITECTURE.md](03_ARCHITECTURE.md) - System architecture
- [TROUBLESHOOTING.md](11_TROUBLESHOOTING.md) - Deployment issues

---

**Next: Read [10_ENVIRONMENT.md](10_ENVIRONMENT.md) untuk understand environment setup**
