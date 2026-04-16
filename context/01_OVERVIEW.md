# 1. SYSTEM OVERVIEW

## 📋 Project Name
**Antigravity** - Ecommerce Order Profit/Loss Auditing & Management Platform

---

## 🎯 What Does This System Do?

### Primary Functions

1. **User Authentication & Management**
   - Login dengan JWT token (24 jam expiry)
   - Sync users otomatis dari Google Sheets setiap 5 menit
   - User roles & permissions (basic auth)

2. **Order Loss Audit Tool** (CORE FEATURE)
   - Analyze order profitability vs database prices
   - Compare setting price vs brand price → detect arbitrage opportunities
   - Flag orders dengan potential losses (First Judge: profit < 0)
   - Validate voucher usage (Second Judge: voucher % > 3% atau price < brand)
   - Generate audit report Excel dengan 4 sheet breakdown

3. **Price Database Management**
   - Maintain 214 SKU dengan 16 price tiers
   - Price tiers: Warning, Daily-Discount, Flash-Sale, dll
   - Support bundle pricing (multi-SKU discount calculation)
   - Clearance items handling

4. **Integration Hub**
   - Google Sheets: Pull user data
   - DingTalk: Send notifications
   - TikTok Ads API: Fetch ad performance data (future)
   - Shopee: Receive order data via Webhook

---

## 🏗️ Tech Stack

### Backend
- **Framework:** FastAPI (Python 3.11)
- **ORM:** SQLAlchemy
- **Database:** PostgreSQL (VPS: 34.126.76.58:5432)
- **Authentication:** JWT (PyJWT)
- **API Client:** gspread (Google Sheets)
- **Data Processing:** Pandas, NumPy
- **Excel Generation:** xlsxwriter

### Frontend
- **Framework:** React 18.2
- **Build Tool:** Vite
- **Package Manager:** npm
- **HTTP Client:** axios
- **Styling:** Tailwind CSS (assumed)

### Deployment
- **Platform:** Google Cloud Run
- **Region:** asia-southeast1-c
- **CI/CD:** Cloud Build
- **Container:** Docker
- **Registry:** Google Artifact Registry

### Development
- **Version Control:** Git (GitHub: dachin-ai/anti-gravity)
- **IDE:** VS Code
- **Terminal:** PowerShell (Windows)

---

## 🗂️ Project Structure

```
Antigravity Project/
├── backend/
│   ├── main.py                           # FastAPI app initialization
│   ├── database.py                       # SQLAlchemy config + pooling
│   ├── models.py                         # Database models (User, Order, Price, etc)
│   ├── schemas.py                        # Pydantic request/response schemas
│   ├── routers/
│   │   ├── auth.py                       # Login, signup, user sync endpoints
│   │   ├── orders.py                     # Order management endpoints
│   │   └── audit.py                      # Order loss audit endpoints
│   ├── services/
│   │   ├── auth_logic.py                 # JWT, user sync, Google Sheets cache
│   │   ├── order_loss_logic.py           # CORE: Audit algorithm + Excel gen
│   │   ├── price_checker_logic.py        # Price lookup + bundle discount
│   │   └── dingtalk_logic.py             # DingTalk webhook notifications
│   ├── dependencies.py                   # DB session, auth dependencies
│   ├── config.py                         # Configuration constants
│   └── requirements.txt                  # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                       # Main React component
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   └── AuditPage.jsx             # Order audit UI
│   │   ├── components/
│   │   └── services/
│   │       └── api.js                    # axios API client
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── .env                                  # Environment variables (NOT in git!)
├── .gitignore
├── Dockerfile                            # Container configuration
├── docker-compose.yml
├── PROJECT_CONTEXT.md                    # Dena's notes on system
└── context/                              # THIS FOLDER - Documentation
    ├── 00_START_HERE.md                  # Index (you are here)
    ├── 01_OVERVIEW.md                    # This file
    ├── 02_DATABASE.md
    ├── 03_ARCHITECTURE.md
    ├── 04_AUTHENTICATION.md
    ├── 05_ORDER_LOSS_AUDIT.md
    ├── 06_API_ENDPOINTS.md
    ├── 07_INTEGRATIONS.md
    ├── 08_BUSINESS_LOGIC.md
    ├── 09_DEPLOYMENT.md
    ├── 10_ENVIRONMENT.md
    ├── 11_TROUBLESHOOTING.md
    └── 12_QUICK_REFERENCE.md
```

---

## 📊 Key Numbers & Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| **Users** | 21 | Synced dari Google Sheets |
| **Price Database** | 214 SKU | 16 tiers per SKU |
| **DB Connections** | 20 pool | +10 overflow capacity |
| **Auth Speed** | 20-30 sec | After optimization (was 60+) |
| **Audit Time** | 2-3 sec | Per Excel file |
| **Sync Interval** | 5 min | Google Sheets cache |
| **JWT Expiry** | 24 hours | Production token lifetime |
| **API Version** | v1 | Current production version |

---

## 🚀 Current Status (April 16, 2026)

### ✅ Working Features
- ✅ User login & JWT authentication
- ✅ User sync dari Google Sheets (21 users)
- ✅ Order loss audit engine
- ✅ Excel report generation (4 sheets)
- ✅ Price database lookup
- ✅ Database connection pooling (optimized)
- ✅ API endpoints untuk audit

### 🚧 In Progress / Maintenance
- 🔧 Cloud Build auto-deployment pipeline
- 📊 Performance monitoring setup
- 📈 Alert system untuk loss orders

### 📝 TODO / Future Enhancements
- 🔮 TikTok Ads API integration (data pipeline)
- 🔮 Advanced analytics dashboard
- 🔮 Bulk order import feature
- 🔮 Automated DingTalk alerts untuk high-loss orders
- 🔮 Multi-user collaboration features
- 🔮 Historical audit tracking

---

## 🔄 Main Workflows

### 1. User Login Flow
```
User Input (email/password)
    ↓
POST /api/auth/login
    ↓
auth_logic.login_user_optimized()
    ├─ Query DB (indexed by email)
    ├─ Verify password
    └─ Generate JWT token
    ↓
Return JWT token (valid 24 hours)
```

### 2. Order Audit Flow
```
User uploads Excel file
    ↓
POST /api/audit/run
    ↓
order_loss_logic.run_order_loss_audit()
    ├─ Load price database (214 SKU)
    ├─ Parse Excel columns (strip whitespace!)
    ├─ Aggregate by order number
    ├─ Calculate setting price vs brand price
    ├─ Apply First Judge logic (profit > 0?)
    ├─ Apply Second Judge logic (voucher % / price gap)
    └─ Generate 4-sheet Excel report
    ↓
Return Excel download + JSON summary
```

### 3. Google Sheets Sync Flow
```
Every 5 minutes OR manual trigger
    ↓
GET Google Sheets API
    ├─ Fetch user list from sheet
    ├─ Cache hasil (5 min TTL)
    └─ On error: use stale cache (fallback)
    ↓
auth_logic.sync_users_from_sheet()
    ├─ Incremental update (tidak delete-all)
    ├─ Compare dengan DB users
    └─ Only update changed records
    ↓
21 users synced successfully
```

---

## 🔐 Security & Credentials

⚠️ **SENSITIVE INFORMATION** - See `DATABASE.md` untuk details

- **Database:** PostgreSQL + password (sanitized)
- **Google Sheets:** Service account JSON
- **JWT Secret:** Cloud Secret Manager
- **VPS SSH:** Multi-factor auth required

---

## 📚 Related Documentation Files

**Next step:** Baca [DATABASE.md](02_DATABASE.md) untuk infrastruktur data

- [DATABASE.md](02_DATABASE.md) - Schema, connections, credentials
- [ARCHITECTURE.md](03_ARCHITECTURE.md) - Data flow diagrams
- [AUTHENTICATION.md](04_AUTHENTICATION.md) - Auth system details
- [ORDER_LOSS_AUDIT.md](05_ORDER_LOSS_AUDIT.md) - Audit algorithm
- [DEPLOYMENT.md](09_DEPLOYMENT.md) - Cloud setup

---

## 💡 Key Insights for New AI

1. **Performance is Critical**
   - Authentication used to be 60+ seconds (no caching)
   - Optimized dengan connection pooling + 5-min cache
   - Now: 20-30 seconds

2. **Data Quality Issues**
   - Excel headers sering punya leading/trailing spaces
   - Pandas Series vs DataFrame comparison bisa ambiguous
   - Need defensive `.strip()` dan explicit type conversion

3. **Business Logic is Complex**
   - 16 price tiers untuk different promotion strategies
   - Bundle discount calculation non-trivial
   - Clearance items treated differently
   - Gift items punya special pricing rules

4. **Order Data is Messy**
   - Excel files berbeda format (Shopee exports)
   - Column names inconsistent between files
   - Missing values perlu fallback logic
   - Duplicate order numbers possible (multi-item orders)

---

## 🎓 Before Making Changes

1. **Understand the database schema** → DATABASE.md
2. **Know the audit algorithm** → ORDER_LOSS_AUDIT.md
3. **Check existing issues** → TROUBLESHOOTING.md
4. **Test with real data** → Use test_file_upload.py
5. **Document changes** → Update this knowledge base

---

**What to Read Next?**
- New to system? → Read [DATABASE.md](02_DATABASE.md)
- Want to fix order audit? → Read [ORDER_LOSS_AUDIT.md](05_ORDER_LOSS_AUDIT.md)
- Deploying changes? → Read [DEPLOYMENT.md](09_DEPLOYMENT.md)
- Confused about something? → Check [TROUBLESHOOTING.md](11_TROUBLESHOOTING.md)
