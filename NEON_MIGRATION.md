# 🚀 Neon PostgreSQL Migration Guide

## Overview
You've updated the `DATABASE_URL` environment variable to point to the new Neon PostgreSQL instance. This guide walks you through the migration process.

---

## ✅ Pre-Migration Checklist

- [x] New Neon database created
- [ ] DATABASE_URL set correctly with Neon connection string
- [ ] Backend code updated with `migrate_to_neon.py` script

---

## 🔧 Migration Steps

### Step 1: Verify Environment Setup

Make sure your `.env` file has the correct Neon connection string:

```bash
# .env (or set in Cloud Run environment variables)
DATABASE_URL=postgresql://username:password@ep-xxx.neon.tech/dbname?sslmode=require
```

**Where to find Neon connection string:**
1. Go to Neon Dashboard: https://console.neon.tech
2. Select your project and database
3. Copy the "Connection String" (postgres protocol)
4. Use it as your DATABASE_URL

---

### Step 2: Run Local Migration (Recommended)

Before deploying to Cloud Run, test the migration locally:

```bash
# Terminal - from backend directory
cd backend

# Set the environment variable
$env:DATABASE_URL="your_neon_connection_string"

# Run the migration script
python migrate_to_neon.py
```

Expected output:
```
============================================================
🚀 Neon PostgreSQL Migration Script
============================================================

Database: postgresql://****:****@ep-xxx.neon.tech/dbname

[1/5] Checking database connection...
✓ Database connection successful

[2/5] Creating tables...
✓ All tables created/verified

[3/5] Verifying tables...
✓ Found 7 tables:
  - account_users
  - activity_logs
  - freemir_name
  - freemir_price
  - shopee_aff_conversions
  - shopee_aff_creators
  - shopee_aff_products

[4/5] Running migrations...
  ✓ Applied: permissions_column_account_users
✓ All migrations completed

[5/5] Verifying schema...
  ✓ account_users has 'permissions' column
  ✓ activity_logs (4 columns)
  ✓ account_users (6 columns)
  ...

============================================================
✓ Migration completed successfully!
============================================================
```

---

### Step 3: Deploy to Cloud Run

Once local migration succeeds:

```bash
# Terminal - from project root
git add .
git commit -m "chore: migrate to neon database and add migration script"
git push origin main
```

This automatically triggers Cloud Build and deploys to Cloud Run.

**Monitor the deployment:**
- Go to: https://console.cloud.google.com/cloud-build/builds
- Wait for both services to succeed:
  - ✓ `anti-gravity` (Backend)
  - ✓ `frontend-anti-gravity` (Frontend)

Expected time: **5-10 minutes**

---

## 📋 Automatic Migration on Backend Startup

The backend is already configured to auto-migrate on startup via `main.py`:

```python
# Creates all tables from models
Base.metadata.create_all(bind=engine)

# Runs inline migrations (e.g., add missing columns)
_run_migrations()
```

This means **even without running the script**, the tables will be created automatically when the backend starts in Cloud Run.

---

## 🔄 Tables Created

| Table | Purpose | Rows |
|-------|---------|------|
| `account_users` | User authentication & permissions | - |
| `activity_logs` | Activity audit trail | - |
| `freemir_price` | Price monitoring data | - |
| `freemir_name` | Product name/link cache | - |
| `shopee_aff_conversions` | Shopee affiliate conversion tracking | - |
| `shopee_aff_products` | Shopee product analytics | - |
| `shopee_aff_creators` | Shopee creator analytics | - |

---

## 🐛 Troubleshooting

### Problem: "Connection refused" error
```
Error: postgresql connection refused
```
**Solution:**
- Verify DATABASE_URL is correct
- Check if Neon project is active
- Ensure your IP is allowed (Neon Dashboard → Security)

### Problem: "Database does not exist"
```
Error: database "dbname" does not exist
```
**Solution:**
- Go to Neon Dashboard
- Create the database with the same name as in your connection string
- Update DATABASE_URL if needed

### Problem: "SSL error" or certificate issues
```
Error: SSL CERTIFICATE_VERIFY_FAILED
```
**Solution:**
- Add `?sslmode=require` to your DATABASE_URL (already in Neon default)
- Or use `?sslmode=prefer` for relaxed SSL

### Problem: Backend won't start after deploy
```
[Startup] ⚠ Database not yet available
```
**Solution:**
- This is OK! Backend starts even if DB is down
- Check Cloud Run logs for actual errors
- Verify DATABASE_URL is set correctly in Cloud Run environment

---

## ✨ Post-Migration Verification

### 1. Check Backend Logs
```bash
# Cloud Console → Cloud Run → anti-gravity service → Logs
# Look for: "[Startup] ✓ Database tables created/verified."
```

### 2. Test Backend Health
```bash
curl https://anti-gravity-xxx.asia-southeast1.run.app/
# Expected: {"message": "Welcome to FastAPI Backend!"}
```

### 3. Test Frontend Connection
```
https://frontend-anti-gravity-xxx.asia-southeast1.run.app/
# Should load login page without errors
```

### 4. Optional: Restore Data (if migrating from old database)

If you have data in the old database that needs to be transferred:

```bash
# Use the activity logs migration as example
python backend/migrate_activity_logs.py
```

This would need to be adapted for other tables.

---

## 📚 Reference

- **Neon Documentation**: https://neon.tech/docs
- **SQLAlchemy**: https://docs.sqlalchemy.org
- **Cloud Run Docs**: https://cloud.google.com/run/docs
- **PostgreSQL**: https://www.postgresql.org/docs/

---

## ✅ Completion Checklist

- [ ] Neon database created
- [ ] DATABASE_URL set in environment
- [ ] Local migration script tested successfully
- [ ] Code pushed to GitHub (triggers Cloud Build)
- [ ] Cloud Build deployment succeeded
- [ ] Backend logs show "Database tables created/verified"
- [ ] Frontend loads without errors
- [ ] Database queries working (test via API if needed)

