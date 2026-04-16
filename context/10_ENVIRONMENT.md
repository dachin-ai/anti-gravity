# 10. ENVIRONMENT CONFIGURATION

## 🔧 Environment Setup

All configuration through `.env` file (NOT in git!)

---

## 📝 .env Template

```bash
# ==================== DATABASE ====================
DATABASE_URL="postgresql://dena_admin:AntiGrav2026Secure@34.126.76.58:5432/antigravity_db"

# ==================== AUTHENTICATION ====================
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_ALGORITHM="HS256"
JWT_EXPIRY_HOURS=24

# ==================== GOOGLE SHEETS ====================
GOOGLE_SHEETS_CREDENTIALS="{'type': 'service_account', 'project_id': '...', ...}"
GOOGLE_SHEET_NAME="user_list"

# ==================== DINGTALK ====================
DINGTALK_WEBHOOK_URL="https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN"

# ==================== TIKTOK (Future) ====================
TIKTOK_CLIENT_ID="your_client_id"
TIKTOK_SECRET_KEY="your_secret_key"
TIKTOK_ACCESS_TOKEN="your_access_token"

# ==================== SHOPEE ====================
SHOPEE_PARTNER_ID="your_partner_id"
SHOPEE_PARTNER_KEY="your_partner_key"
SHOPEE_WEBHOOK_SECRET="your_webhook_secret"

# ==================== APP SETTINGS ====================
ENVIRONMENT="production"  # development, staging, production
DEBUG=False
WORKERS=4
LOG_LEVEL="INFO"

# ==================== CORS ====================
CORS_ORIGINS="https://app.antigravity.cloud,http://localhost:3000"

# ==================== RATE LIMITING ====================
RATE_LIMIT_ENABLED=True
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_PERIOD=60

# ==================== CACHE ====================
CACHE_DURATION_SECONDS=300  # 5 minutes
ENABLE_CACHING=True

# ==================== PERFORMANCE ====================
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10
DB_POOL_RECYCLE=3600
```

---

## 🔑 Key Environment Variables Explained

### DATABASE_URL

```
Format: postgresql://username:password@host:port/database

postgresql://        → Protocol (PostgreSQL)
dena_admin          → Username
:AntiGrav2026...    → Password (sanitized in docs!)
@34.126.76.58       → VPS IP address
:5432               → PostgreSQL port
/antigravity_db     → Database name

NEVER put in git! Use Secret Manager in production.
```

### JWT_SECRET

```
Created with: secrets.token_urlsafe(32)
Length: Should be 32+ characters
Change: Must change if exposed!
Rotation: Do NOT rotate without logout all users

Used for:
- Signing JWTs (login tokens)
- Verifying JWTs (authenticated requests)
```

### GOOGLE_SHEETS_CREDENTIALS

JSON format from Google Cloud service account:

```json
{
  "type": "service_account",
  "project_id": "your-gcp-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "service-account@project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

Store as environment variable (not JSON file) untuk cloud deployment.

---

## 📦 Dependency Management

### requirements.txt

```
# Web Framework
fastapi==0.104.1
uvicorn==0.24.0
python-multipart==0.0.6

# Database
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
alembic==1.12.1  # Database migrations

# Authentication
PyJWT==2.8.1
passlib==1.7.4
bcrypt==4.1.1
python-dotenv==1.0.0

# Data Processing
pandas==2.1.3
numpy==1.26.2
openpyxl==3.11.0  # Read Excel
xlsxwriter==3.1.9  # Write Excel

# External APIs
gspread==5.12.0  # Google Sheets
requests==2.31.0  # HTTP client

# Security/Production
pydantic==2.5.0
pydantic-settings==2.1.0

# Optional
pytest==7.4.3  # Testing
httpx==0.25.1  # Async HTTP
```

### Version Management

**Pinned versions:** Always pin package versions!
```bash
# ✅ Good (reproducible)
fastapi==0.104.1

# ❌ Bad (unstable)
fastapi>=0.100.0
fastapi
```

### Installation

```bash
# Create venv
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Update requirements (only if tested)
pip freeze > requirements.txt
```

---

## 🌍 Environment-Specific Configurations

### Development (.env.dev)

```
ENVIRONMENT=development
DEBUG=True
DATABASE_URL=postgresql://...@localhost:5432/antigravity_dev
JWT_SECRET=dev-secret-not-secure
LOG_LEVEL=DEBUG
WORKERS=1
ENABLE_CACHING=False  # Faster iteration
```

### Staging (.env.staging)

```
ENVIRONMENT=staging
DEBUG=False
DATABASE_URL=postgresql://...@staging-db:5432/antigravity_staging
JWT_SECRET=<from-secret-manager>
LOG_LEVEL=INFO
WORKERS=2
ENABLE_CACHING=True
```

### Production (.env.prod or Cloud Secret Manager)

```
ENVIRONMENT=production
DEBUG=False
DATABASE_URL=postgresql://...@34.126.76.58:5432/antigravity_db
JWT_SECRET=<from-secret-manager>
LOG_LEVEL=WARN
WORKERS=4
ENABLE_CACHING=True
RATE_LIMIT_ENABLED=True
```

---

## 🔐 Credential Management Best Practices

### ✅ DO

```bash
# ✅ Store in .env (local dev only)
DATABASE_URL="..."

# ✅ Store in Cloud Secret Manager (production)
gcloud secrets create database-url --data-file=-

# ✅ Reference in Cloud Run
--set-env-vars "DATABASE_URL=projects/PROJECT/secrets/database-url/versions/latest"

# ✅ Use .env.sample for documentation (no secrets!)
DATABASE_URL=<your-database-url-here>
```

### ❌ DON'T

```bash
# ❌ Commit to git
git add .env  # NEVER!

# ❌ Environment variables with hardcoded secrets in code
app_password = "hardcoded123"

# ❌ Log sensitive data
logger.info(f"Connected with password: {db_password}")

# ❌ Embed secrets in Docker image
FROM ubuntu
ENV DATABASE_URL="postgresql://..."  # EXPOSED!
```

### .gitignore Configuration

```
# Never commit
.env
.env.local
.env.*.local
secrets/
credentials.json
*.pem
*.key
```

---

## 🚀 Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/dachin-ai/anti-gravity.git
cd "Antigravity Project"
```

### 2. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate.bat  # Windows
```

### 3. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Setup Environment

```bash
# Copy template
cp .env.sample .env

# Edit with your values
# - DATABASE_URL (local or VPS)
# - JWT_SECRET (any random string)
# - Google Sheets credentials (if needed)
```

### 5. Run Server

```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 6. Test Connection

```bash
curl http://localhost:8000/api/health
# Should return: {"status": "healthy", ...}
```

---

## 🧪 Testing Environment Configuration

### pytest.ini

```ini
[pytest]
testpaths = tests/
python_files = test_*.py
python_classes = Test*
python_functions = test_*
```

### Test Configuration

```python
# tests/conftest.py

import os
from dotenv import load_dotenv

# Load test environment
load_dotenv(".env.test")

@pytest.fixture
def test_db():
    """Create test database"""
    # Use temporary database
    # Clean up after test
    pass

@pytest.fixture
def test_client():
    """Create FastAPI test client"""
    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)
```

---

## 🔄 Configuration Hierarchy

**Priority order (highest to lowest):**

```
1. Environment variables (OS level)
   e.g.: export DATABASE_URL="..."

2. Cloud Secret Manager (production)
   e.g.: gcloud secrets configure

3. .env file (local development)
   e.g.: .env in project root

4. Default values in code
   e.g.: os.getenv("KEY", "default")
```

**Example:**

```python
# In code
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://localhost:5432/antigravity_dev"
)

# Priority:
# 1. If env var set → use it
# 2. If .env has key → use it
# 3. If neither → use default
```

---

## 📊 Configuration Validation

### On Startup

```python
# main.py

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str = Field(min_length=32)
    environment: str
    
    class Config:
        env_file = ".env"

settings = Settings()

# Validation errors on missing required vars!
```

### Health Checks

```python
@app.on_event("startup")
async def validate_config():
    """Validate all required configs on startup"""
    
    # Check database
    try:
        engine.connect()
        logger.info("✓ Database configured")
    except Exception as e:
        logger.error(f"✗ Database error: {e}")
        raise
    
    # Check Google Sheets access
    try:
        client.openbykey(spreadsheet_key)
        logger.info("✓ Google Sheets accessible")
    except Exception as e:
        logger.error(f"✗ Google Sheets error: {e}")
        # Non-fatal, can continue
```

---

## 📚 Related Files

- [DEPLOYMENT.md](09_DEPLOYMENT.md) - Cloud deployment config
- [DATABASE.md](02_DATABASE.md) - Database configuration
- [AUTHENTICATION.md](04_AUTHENTICATION.md) - Auth config

---

**Next: Read [11_TROUBLESHOOTING.md](11_TROUBLESHOOTING.md) for common issues**
