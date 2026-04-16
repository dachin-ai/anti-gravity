# 12. QUICK REFERENCE

## ⚡ Cheat Sheet for Antigravity System

---

## 🚀 Important Commands

### Start Backend Server

```bash
cd "c:\Users\denaf\Antigravity Project\backend"
python -m uvicorn main:app --reload
# Open: http://localhost:8000/api/health
```

### Start Frontend

```bash
cd "c:\Users\denaf\Antigravity Project\frontend"
npm install
npm run dev
# Open: http://localhost:5173
```

### Database Access

```bash
psql -h 34.126.76.58 -U dena_admin -d antigravity_db
# Password: AntiGrav2026Secure
```

### Git Commands

```bash
# View changes
git status
git diff

# Stage & commit
git add .
git commit -m "Fix: description"

# Push to production
git push origin main
# Triggers Cloud Build → Cloud Run deploy
```

---

## 📊 Key Numbers

| Item | Value | Notes |
|------|-------|-------|
| Users | 21 | From Google Sheets |
| SKUs | 214 | Price database |
| Price Tiers | 16 | Different scenarios |
| DB Connections | 20 | Pool size |
| Auth Speed | 20-30 sec | After optimization |
| Audit Speed | 2-3 sec | Per Excel file |
| JWT Expiry | 24 hours | Login token |
| Cache Duration | 5 min | Google Sheets |
| Max URL | Max 10K rows | Excel audit |

---

## 🔑 Critical Files

| File | Purpose | When to Edit |
|------|---------|-------------|
| [database.py](../backend/database.py) | DB connection pool | Change pool size |
| [main.py](../backend/main.py) | App initialization | Add new routes |
| [auth_logic.py](../backend/services/auth_logic.py) | Login & sync | Fix auth bugs |
| [order_loss_logic.py](../backend/services/order_loss_logic.py) | Audit algorithm | Fix audit logic |
| [.env](.env) | Configuration | Set secrets (not git!) |

---

## 🌐 Important URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | UI (dev) |
| Backend | http://localhost:8000 | API (dev) |
| Database | 34.126.76.58:5432 | PostgreSQL |
| Production API | https://api.antigravity.cloud | Live API |
| Production Frontend | https://antigravity.cloud | Live UI |
| Cloud Build | https://console.cloud.google.com/cloud-build/ | CI/CD |
| Cloud Run | https://console.cloud.google.com/run/ | Hosting |

---

## 🔐 Credentials (Sanitized)

```
Database:
  Host: 34.126.76.58:5432
  User: dena_admin
  Password: (see Cloud Secret Manager)
  Database: antigravity_db

JWT Secret: (see .env or Cloud Secret Manager)

Google Sheets: (see Cloud Storage)

DingTalk Token: (see .env or Cloud Secret Manager)
```

---

## 📝 API Endpoint Summary

### Auth

```
POST   /api/auth/login              → Get JWT token
POST   /api/auth/verify             → Check token validity
POST   /api/auth/sync-users         → Sync from Google Sheets
```

### Audit

```
POST   /api/audit/run               → Run order audit
GET    /api/audit/report/{id}       → Get past report
GET    /api/audit/download/{id}     → Download Excel
```

### Price

```
GET    /api/prices                  → List all SKU
POST   /api/prices                  → Create SKU
PUT    /api/prices/{sku}            → Update SKU
```

### System

```
GET    /api/health                  → API health check
GET    /api/stats                   → System statistics
```

---

## 🐛 Common Errors Quick Fix

| Error | Fix |
|-------|-----|
| "Connection refused" | Check DATABASE_URL in .env (should be 34.126.76.58, not localhost) |
| "Token expired" | User must login again |
| "Missing columns" | Check Excel column names match system requirements |
| "Series ambiguous" | Convert to float before comparison: `float(value)` |
| "Connection pool exceeded" | Increase pool_size in database.py (current: 20) |
| Slow login (60+ sec) | Check pool_size=20 and caching enabled |
| No users syncing | Check Google Sheets credentials and cache duration |

---

## ✅ Performance Targets

```
Login:              < 5 sec        (currently 20-30 sec)
Audit processing:   < 5 sec        (currently 2-3 sec)
DB query:           < 100ms        (currently 50-100ms)
API response:       < 1 sec        (varies by endpoint)
Page load:          < 3 sec        (frontend)
```

---

## 🔄 Database Schema Quick Look

```
users               → Login accounts (21 total)
  id, email, password_hash, role, last_login_at

prices              → Product prices (214 SKU)
  sku, product_name, warning_price, cost_price, ...

orders              → Order history
  id, order_number, store, total_profit, audit_result

order_items         → Items per order
  id, order_id, sku, quantity, unit_profit

audit_reports       → Audit results
  id, file_name, summary_data, created_by
```

---

## 📊 Price Tiers (Simple View)

```
1. Warning         → Baseline (used in audit)
2. Daily-Discount  → 5-10% off
3. Flash-Sale      → 20-30% off
4. Promotion       → 10-15% off
5-7. Bundle/Seasonal/Clearance
8-16. VIP/Bulk/Regional/Partner/etc.
```

---

## 🚀 Deployment Flow

```
1. Make code changes locally
   ↓
2. Commit & push to GitHub main branch
   $ git push origin main
   ↓
3. Cloud Build auto-triggered
   - Build Docker image
   - Run tests
   - Push to Artifact Registry
   ↓
4. Deploy to Cloud Run
   - New service revision
   - Auto-scaled
   - Connected to VPS database
   ↓
5. Live at https://api.antigravity.cloud
```

---

## 🧪 Test Data

```
Test Excel File:
  待审核订单 (2).xlsx
  114 transactions
  60 unique orders
  Result: 9 safe, 51 need review

Test User:
  Email: user@example.com
  Password: (see setup docs)
```

---

## 🔋 Performance Optimization Tips

### Already Implemented
- ✅ Connection pooling (20 connections)
- ✅ Google Sheets cache (5 minutes)
- ✅ Single-query login (vs multi-query)
- ✅ Incremental user sync (vs delete-all)
- ✅ Indexed database columns

### Could Further Optimize
- [ ] Redis caching layer (for price data)
- [ ] GraphQL instead of REST (reduce payloads)
- [ ] Async Excel generation (large files)
- [ ] CDN for static assets
- [ ] Database read replicas (reporting queries)

---

## 🔐 Security Checklist

- [x] Password hashing (bcrypt)
- [x] JWT token authentication
- [x] Database connection pooling (no resource leaks)
- [x] SQL injection prevention (SQLAlchemy ORM)
- [x] Secrets NOT in git (.gitignore)
- [ ] Rate limiting (planned)
- [ ] 2FA (future)
- [ ] CORS properly configured

---

## 📚 Documentation Index

Quick access to all docs:

```
00_START_HERE.md             ← Read this first!
01_OVERVIEW.md               ← System overview
02_DATABASE.md               ← DB schema & config
03_ARCHITECTURE.md           ← System design & flow
04_AUTHENTICATION.md         ← Auth logic
05_ORDER_LOSS_AUDIT.md       ← Audit algorithm (CRITICAL)
06_API_ENDPOINTS.md          ← REST API spec
07_INTEGRATIONS.md           ← Google Sheets, DingTalk, etc
08_BUSINESS_LOGIC.md         ← Pricing tiers & rules
09_DEPLOYMENT.md             ← Cloud Run setup
10_ENVIRONMENT.md            ← .env configuration
11_TROUBLESHOOTING.md        ← Common issues & fixes
12_QUICK_REFERENCE.md        ← This file (cheat sheet)
```

---

## 💬 Support Resources

### Documentation
- FastAPI: https://fastapi.tiangolo.com
- SQLAlchemy: https://www.sqlalchemy.org
- Pandas: https://pandas.pydata.org
- PostgreSQL: https://www.postgresql.org/docs/

### Tools
- DBeaver (DB client): https://dbeaver.io
- Postman (API testing): https://www.postman.com
- VS Code: https://code.visualstudio.com

### Team
- Project Owner: Dena Firdaus (denaf)
- Repository: https://github.com/dachin-ai/anti-gravity
- Issues: GitHub Issues

---

## 🎯 Next Steps (Priority Order)

1. **Understand Core Logic** (30 min)
   - Read: OVERVIEW.md → DATABASE.md → ARCHITECTURE.md

2. **Understand Audit Algorithm** (30 min)
   - Read: ORDER_LOSS_AUDIT.md
   - Test with sample Excel file

3. **Try it Yourself** (1 hour)
   - Start backend locally
   - Test login API
   - Test audit API
   - Check results in Excel

4. **Deploy a Change** (30 min)
   - Edit auth_logic.py (small fix)
   - Commit & push
   - Monitor Cloud Build
   - Verify on production

5. **Read Remaining Docs** (2 hours)
   - API_ENDPOINTS.md
   - DEPLOYMENT.md
   - TROUBLESHOOTING.md

---

## 🎓 Learning Path

### For Frontend Developer
1. OVERVIEW.md
2. API_ENDPOINTS.md
3. ARCHITECTURE.md (understand request flow)

### For Backend Developer
1. OVERVIEW.md
2. DATABASE.md
3. AUTHENTICATION.md
4. ORDER_LOSS_AUDIT.md
5. CODE_WALKTHROUGH.md (if existed)

### For DevOps/Infrastructure
1. OVERVIEW.md
2. DEPLOYMENT.md
3. ENVIRONMENT.md
4. ARCHITECTURE.md

### For Business/Product
1. OVERVIEW.md
2. BUSINESS_LOGIC.md
3. API_ENDPOINTS.md

---

## 🏁 Ready to Start?

1. **Have the code?**
   ```bash
   cd "c:\Users\denaf\Antigravity Project"
   ```

2. **Know your role?**
   - Backend dev? → Start with 02_DATABASE.md
   - Frontend dev? → Start with 06_API_ENDPOINTS.md
   - DevOps? → Start with 09_DEPLOYMENT.md

3. **Need to get this code running?**
   - Start backend: `python -m uvicorn main:app --reload`
   - Start frontend: `npm run dev`
   - Test API: `curl http://localhost:8000/api/health`

4. **Have a problem?**
   - Check 11_TROUBLESHOOTING.md first
   - Search code with grep/semantic search
   - Check git history: `git log --oneline`

---

**Good luck! The system is designed to be maintainable and scalable. You've got this! 🚀**
