# 🧠 Antigravity Project — Context & Knowledge Base
> Terakhir diupdate: 20 April 2026
> Dibuat untuk referensi AI assistant di sesi berikutnya.

---

## 1. ARSITEKTUR & ALUR SISTEM

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION FLOW                              │
│                                                                     │
│  👤 User Browser                                                    │
│       │                                                             │
│       ▼                                                             │
│  ☁️ Frontend (Cloud Run)                                            │
│  Service: frontend-anti-gravity                                     │
│  URL: https://frontend-anti-gravity-123563250077.asia-southeast1    │
│       .run.app                                                      │
│  Tech: React + Vite + Nginx (Dockerfile)                            │
│       │                                                             │
│       ▼ (API calls via axios → absolute URL)                        │
│                                                                     │
│  ☁️ Backend (Cloud Run)                                             │
│  Service: anti-gravity                                              │
│  URL: https://anti-gravity-123563250077.asia-southeast1.run.app     │
│  Tech: FastAPI + Uvicorn (Dockerfile)                               │
│       │                                                             │
│       ├──▶ 🐘 PostgreSQL Database (PRIMARY)                           │
│       │    Host: 35.198.222.19 (VPS Production)                       │
│       │    DB: antigravity_db                                         │
│       │    User: dena_admin                                           │
│       │    Pass: AntiGrav2026Secure                                   │
│       │    Status: ACTIVE - Production Ready                          │
│       │                                                             │
│       ├──▶ 📊 Google Sheets (Price + Name Reference)               │
│       │    Spreadsheet ID: 1aS1wpEJ5jIYFYYsZT1U4-gabyb5XwGn4u1-OpRhiucc │
│       │    URL: https://docs.google.com/spreadsheets/d/             │
│       │         1aS1wpEJ5jIYFYYsZT1U4-gabyb5XwGn4u1-OpRhiucc      │
│       │    Auth: credentials.json (GCP Service Account)             │
│       │    Tabs: Price, All_Name (price reference, sync ke PostgreSQL) │
│       │                                                             │
│       └──▶ 🔔 DingTalk Webhook (Activity Notifications)            │
│            Env: DINGTALK_WEBHOOK_URL, DINGTALK_SECRET               │
│                                                                     │
│  🖥️ VPS Production Database                                        │
│  IP: 35.198.222.19                                                 │
│  Zone: asia-southeast1-b                                            │
│  Spec: Production-ready                                             │
│  OS: Ubuntu 24.04                                                   │
│  User: dachinetech_ai                                               │
│  Database: antigravity_db                                           │
│  Status: ACTIVE - Primary Database                                  │
│                                                                     │
│  📊 Database Statistics                                            │
│  - Tables: 13 active                                               │
│  - Affiliate Data: 140K+ conversions, 17K+ products, 36K+ creators │
│  - Price Data: 214 prices, 13K+ names                             │
│  - Users: 23 active accounts                                        │
│  - Performance: 16K+ records, 735 logs                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Alur Deploy (CI/CD)
```
Developer PC → git push main → Cloud Build Trigger → Auto-deploy BE + FE ke Cloud Run
```
- Config file: `/cloudbuild.yaml`
- Trigger name: `deploy-antigravity`
- Region: `asia-southeast1`
- Service account: `123563250077-compute@developer.gserviceaccount.com`

---

## 2. AKUN & KREDENSIAL

### Platform & Akun Utama
| Platform | Akun / Credential | Notes |
|---|---|---|
| **GitHub** | `dachin-ai/anti-gravity` (branch: `main`) | Repo utama, push ke main = auto-deploy |
| **GCP Project** | ID: `dachin-ai-493209`, Number: `123563250077` | Cloud Run + Cloud Build |
| **GCP Service Account** | `123563250077-compute@developer.gserviceaccount.com` | Untuk Cloud Build trigger |
| **GCP Region** | `asia-southeast1` (Singapore) | Semua Cloud Run services |
| **Render.com** | Backend auto-deploy dari GitHub main | Service: `render-anti-gravity` |
| **Neon** | `neondb_owner` / `npg_e1Jl3rWoTcAR` | PRIMARY DB sejak April 2026 |
| **Neon Host** | `ep-withered-butterfly-ao66aczs-pooler.c-2.ap-southeast-1.aws.neon.tech` | Pooled connection |
| **Neon DB Name** | `neondb` | |
| **VPS (lama)** | `dachinetech_ai@34.126.76.58` (antigravity-vps) | TIDAK AKTIF, standby |
| **VPS DB lama** | `dena_admin` / `AntiGrav2026Secure` @ `34.126.76.58:5432/antigravity_db` | Sudah tidak dipakai |
| **JWT Secret** | `freemir_tools_2026_secret_key_change_in_prod` (env: `JWT_SECRET`) | ⚠️ Hardcoded default |
| **JWT Expiry** | 24 jam | |
| **Google Sheets** | Spreadsheet ID: `1aS1wpEJ5jIYFYYsZT1U4-gabyb5XwGn4u1-OpRhiucc` | Price + Name reference |
| **Google Sheets Auth** | `credentials.json` (GCP service account key) | Tidak ada di git |
| **DingTalk** | `DINGTALK_WEBHOOK_URL` + `DINGTALK_SECRET` (env vars) | Notifikasi aktivitas |

### Environment Variables (Backend — Render.com & local .env)
| Var | Value | Keterangan |
|---|---|---|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_e1Jl3rWoTcAR@ep-withered-butterfly-ao66aczs-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` | Neon PRIMARY |
| `JWT_SECRET` | `freemir_tools_2026_secret_key_change_in_prod` | Hardcoded fallback |
| `DINGTALK_WEBHOOK_URL` | (optional) | Notifikasi |
| `DINGTALK_SECRET` | (optional) | HMAC signing |

### Frontend Token Storage (localStorage)
| Key | Isi |
|---|---|
| `fm_token` | JWT Bearer token |
| `fm_user` | JSON user data (username, email, permissions) |
| `fm_login_date` | Tanggal login (auto-logout kalau beda hari) |

### File Sensitif (tidak ada di git)
- `backend/credentials.json` — GCP service account key untuk Google Sheets
- `backend/.env` — DATABASE_URL + env vars lokal

---

## 3. DATABASE SCHEMA

### Tabel PostgreSQL (`antigravity_db`)

| Tabel | Primary Key | Deskripsi |
|---|---|---|
| `account_users` | `id` (auto) | User login: email, username, password (SHA-256), approval status, permissions (JSON) |
| `activity_logs` | `id` (auto) | Log aktivitas: time (Jakarta TZ), username, tools |
| `freemir_price` | `sku` | Harga per SKU: category, clearance, prices (JSON: Warning, Daily-Discount, dll) |
| `freemir_name` | `sku` | Nama & link produk per SKU |
| `shopee_aff_conversions` | `id` (auto) | Data konversi affiliate: order_id, store_id, order_time, status, product, affiliate, value, commission |
| `shopee_aff_products` | `id` (auto) | Data produk affiliate per hari: store_id, product_id, gmv, unit_sold, commission, roi |
| `shopee_aff_creators` | `id` (auto) | Data kreator affiliate per hari: store_id, affiliate_username, gmv, unit_sold, clicks, commission, roi |

### Google Sheets Tabs (Admin Base)
| Tab | Fungsi |
|---|---|
| `Account` | Master user: Email, Username, Password, Approval, + permission columns (price_checker, order_planner, dll) |
| `Activity Log` | (Legacy) Log aktivitas |
| `Price` | Master harga per SKU — disync ke tabel `freemir_price` |
| `All_Name` | Nama + link produk per SKU — disync ke tabel `freemir_name` |
| `Stock`, `Input Stock`, `Input Price` | Data stok dan input harga |
| `Dictionary`, `AT1-AT3` | Data referensi internal |

---

## 4. AUTHENTICATION & PERMISSION SYSTEM

### Login Flow
```
1. User submit username + password
2. Backend: find_user_by_username() → query account_users (case-insensitive)
3. Backend: hash_password(input) vs stored hash (SHA-256)
4. Backend: check approval status ("approve" = OK, "waiting" = pending)
5. Backend: generate JWT token (payload: username, email, permissions, exp 24h)
6. Frontend: simpan token di localStorage (key: fm_token)
7. Frontend: axios interceptor auto-attach "Bearer {token}" ke semua request
```

### Permission System
- 7 tool keys: `price_checker`, `order_planner`, `order_review`, `affiliate_performance`, `pre_sales`, `affiliate_analyzer`, `ads_analyzer`
- Definisi di Google Sheets tab "Account" → kolom per tool key (1 = access, 0 = no access)
- Disync ke `account_users.permissions` (JSON column) via `/api/auth/sync-users`
- Backend guard: `require_tool_access("tool_key")` — FastAPI dependency yang cek JWT payload
- Frontend guard: `<PermissionGate toolKey="xxx">` — React component wrapper
- Sidebar: menu item yang restricted tampil abu-abu + icon lock 🔒

### Token Storage (Frontend)
- `fm_token` — JWT token
- `fm_user` — cached user data (JSON)
- `fm_login_date` — tanggal login (auto-logout kalau beda hari)

---

## 5. TOOLS & LOGIC

### 📁 Freemir Suite

#### 🔍 Price Checker (`/price-checker`)
- **Permission**: `price_checker`
- **Backend**: `/api/price-checker/*`
- **Logic** (`price_checker_logic.py`):
  - **Load Database**: Query `freemir_price` + `freemir_name` dari PostgreSQL → cache di memory
  - **Sync Prices**: Baca Google Sheets (tab "Price" + "All_Name") → TRUNCATE + INSERT ke PostgreSQL
  - **Direct Input**: Input SKU string (misal "SKU_A + SKU_B") + target price → hitung harga bundle
  - **Batch (Listing/SKU)**: Upload Excel → proses semua baris → return Excel hasil + preview
- **Pricing Logic** (diperbarui 20 Apr 2026):
  - Bundle Discount: 1 item=0%, 2=2%, 3=3%, 4=4.5%, 5+=5%
  - Gift items: harga × 50% (hanya jika ada item NON-gift dalam bundle)
  - Clearance: override semua harga dengan clearance value, tidak ada diskon
  - Floor Protection: jika total setelah diskon < total Warning price → pakai Warning price (tanpa diskon)
  - 16 tier harga: Warning, Daily-Discount, Daily-Livestream, Daily-Mid-Creator, Daily-Top-Creator, Daily-FS, Daily-Shopee-FS, DD-FS, DD-Shoptab, DD-Livestream, DD-Mid-Creator, DD-Top-Creator, PD-Shoptab, PD-Livestream, PD-Mid-Creator, PD-Top-Creator
  - Output Excel multi-sheet: All, Reminder (yang under warning), Account Responsible, Livestreamer, Affiliate
  - **Bug fix 20 Apr**: `parse_idr_price()` — nilai float dari Neon DB (misal `15000.0`) tidak boleh di-strip digit karena titik desimal akan ikut terhapus → 10x lipat. Fix: cek `isinstance(val, (int, float))` terlebih dahulu

#### 📦 Order Planner / Warehouse Order (`/warehouse-order`)
- **Permission**: `order_planner`
- **Backend**: `/api/warehouse-order/calculate`
- **Logic** (`warehouse_order_logic.py`):
  - Input: AOV, total days, platforms (nama + target), warehouses (proporsi), events (tanggal + proporsi)
  - Output: estimasi order per warehouse per hari, termasuk event uplift

### 📁 Shopee Suite

#### 📊 Order Review / Order Loss (`/order-loss`)
- **Permission**: `order_review`
- **Backend**: `/api/order-loss/calculate`
- **Logic** (`order_loss_logic.py`):
  - Upload CSV/Excel order data dari Shopee
  - Cross-reference dengan Price Checker database (freemir_price)
  - Hitung profit/loss per order berdasarkan price tier
  - Output: summary + Excel hasil audit

#### 🤝 Shopee Affiliate Performance (`/shopee-affiliate`)
- **Permission**: `affiliate_performance`
- **Backend**: `/api/shopee-affiliate/*`
- **Logic** (`shopee_affiliate_logic.py` + `shopee_affiliate.py` router):
  - **Stores**: Daftar toko Shopee (hardcoded di logic)
  - **Upload ETL**: Upload CSV affiliate data (3 tipe: conversion, product, creator) → parse & simpan ke PostgreSQL
  - **Checker Matrix**: Cek data availability per hari/store/tipe
  - **Report**: 3 dimensi (by_store, by_creator, by_product) → aggregate GMV, commission, ROI, units, clicks
  - **Comparison**: Bandingkan 2 periode (Period A vs B) → delta GMV, commission, ROI
  - **Download Excel**: Export report ke Excel dengan styling professional
  - **Delete**: Hapus data per tanggal/store/tipe

### 📁 TikTok Suite

#### 📈 Pre-Sales Checker (`/pre-sales`)
- **Permission**: `pre_sales`
- **Backend**: `/api/pre-sales/calculate`
- **Logic** (`presales_logic.py`):
  - Upload file pre-sales data
  - Proses estimasi → summary + Excel output

#### 🔗 Affiliate Analyzer (`/affiliate-analyzer`)
- **Permission**: `affiliate_analyzer`
- **Backend**: `/api/affiliate/analyze`
- **Logic** (`affiliate_logic.py`):
  - Upload 2 file (File A + File B) + mode
  - Analisis perbandingan affiliate data
  - Output: JSON result

#### 📺 TikTok Ads Analyzer (`/tiktok-ads`)
- **Permission**: `ads_analyzer`
- **Backend**: `/api/tiktok-ads/analyze`
- **Logic** (`tiktok_ads_logic.py`):
  - Upload multiple file (base64 encoded) → analyze TikTok ads performance
  - Output: analysis result

### 📁 Tools Tanpa Permission Guard (unrestricted)

| Tool | Route | Backend | Deskripsi |
|---|---|---|---|
| **Dashboard / BI Hub** | `/` | — | Landing page dengan summary |
| **Failed Delivery** | `/failed-delivery` | `/api/failed-delivery/*` | Analisis pengiriman gagal |
| **ERP OOS Calculate** | `/erp-oos` | `/api/erp-oos/*` | Kalkulasi out-of-stock ERP |
| **SKU Monthly Plan** | `/sku-plan` | `/api/sku-plan/*` | Perencanaan SKU bulanan |
| **Conversion Cleaner** | `/conversion-cleaner` | `/api/conversion-cleaner/*` | Pembersihan data konversi |
| **Order Match Checker** | `/order-match` | `/api/order-match/*` | Pencocokan order |
| **Socmed Scraping** | `/socmed-scraping` | `/api/socmed/*` | Scraping media sosial |

---

## 6. FRONTEND ARCHITECTURE

```
frontend/
├── Dockerfile            # Build: npm install + npm run build → serve via Nginx
├── nginx.conf            # Simple static file server (port 8080)
├── src/
│   ├── App.jsx           # Root: ConfigProvider (dark theme) + Router + AuthProvider
│   ├── api.js            # Axios instance + Bearer token interceptor
│   ├── context/
│   │   └── AuthContext.jsx  # Auth state: login, logout, verify, hasAccess, logActivity
│   ├── components/
│   │   ├── PermissionGate.jsx  # Route guard: check tool access
│   │   └── Bi.jsx              # Bilingual text component (English + Chinese)
│   ├── layout/
│   │   └── MainLayout.jsx      # Sidebar + top bar + content area
│   └── pages/
│       ├── LoginPage.jsx
│       ├── Dashboard.jsx
│       ├── PriceChecker.jsx
│       ├── OrderLossReview.jsx
│       ├── ShopeeAffiliate.jsx
│       ├── ... (14 pages total)
```

---

## 10. UI ARCHITECTURE (Update 20 April 2026)

### Design System
- **Theme**: Dark mode (bg app: `#020617` Slate 950, bg card: `#0f172a`)
- **CSS Custom Properties**: `--bg-app`, `--bg-card`, `--border`, `--text-main`, `--text-muted`, `--indigo`
- **Primary Color**: Indigo `#6366f1` (Freemir Suite)
- **Accent Colors per Suite**: Shopee `#f97316` (orange), TikTok `#ec4899` (pink)
- **Font**: Inter (body), Outfit (headings)
- **UI Library**: Ant Design v6.3.5 (dark algorithm)

### Background Galaxy (`frontend/src/index.css`)
- `body::before`: Galaksi spiral diagonal (rotate -32deg scale 1.55)
  - Core terang di ~58% 40%
  - Diagonal disk tipis (ellipse horizontal)
  - 4 spiral arms (upper-right, lower-left, upper-left, lower-right)
  - Warm sun glow pojok kiri bawah: `rgba(251,191,36,0.18)` + corona `rgba(255,237,180,0.22)`
  - Accent nebula pink pojok kanan atas
- `body::after`: Star-field 5 layer ukuran prima (353, 521, 211, 151, 631px) — tidak ada pola grid

### Komponen UI Baru
| File | Deskripsi |
|---|---|
| `frontend/src/components/PageHeader.jsx` | Reusable page header: left accent bar + title + subtitle + actions. Props: `title`, `subtitle`, `accent`, `actions` |
| `frontend/src/components/Panda.jsx` | Panda mascot animasi — fixed bottom-right, strip lebar 260px, mulai duduk, klik = toggle jalan/duduk, hilang saat tab hidden |

### Panda Mascot Detail
- `position: fixed`, `bottom: 16`, `right: 0`, `width: 260px`
- State awal: **duduk** (mata ngantuk)
- **Klik** → toggle jalan ↔ duduk
- Outline: SVG `<filter>` `feMorphology dilate radius=1.3` → outline putih tipis
- `overflow="visible"` pada SVG agar kepala/telinga tidak ter-clip
- Walk speed: 1.3px / 35ms interval
- Tab hidden → `visibilitychange` → panda hilang
- CSS classes di `index.css`: `.panda-leg-l`, `.panda-leg-r`, `.panda-walk`

### Wajan SVG (Topbar)
- Menggantikan spatula lama di topbar `MainLayout.jsx`
- Animasi: `@keyframes rotate-wajan` (rotasi continuous) + `@keyframes pulse-wajan`
- Hover: `scale(1.12)` via `transition`, tidak restart animasi

### PageHeader Accent Colors
| Tool | Accent |
|---|---|
| Price Checker | `#6366f1` (indigo) |
| Order Review | `#f97316` (orange) |
| Pre-Sales Checker | `#ec4899` (pink) |
| Warehouse Order | `#6366f1` (indigo) |
| TikTok Ads | `#ec4899` (pink) |
| Affiliate Analyzer | `#ec4899` (pink) |
| Shopee Affiliate | `#f97316` (orange) |

---

## 7. BACKEND ARCHITECTURE

```
backend/
├── Dockerfile           # python:3.11-slim → pip install → uvicorn main:app --port 8080
├── main.py              # FastAPI app: CORS *, include semua routers, auto-create tables, inline migrations
├── database.py          # SQLAlchemy engine (DATABASE_URL from env), SessionLocal, Base
├── models.py            # 7 SQLAlchemy models (AccountUser, ActivityLog, FreemirPrice, FreemirName, ShopeeAff*)
├── credentials.json     # GCP service account key (NOT in git)
├── .env                 # DATABASE_URL (NOT in git, NOT in Docker)
├── routers/             # 14 FastAPI routers
│   ├── auth.py          # /api/auth/* (login, signup, verify, sync-users, log-activity, test-sheet)
│   ├── price_checker.py # /api/price-checker/* (refresh, sync-neon, calculate-direct, calculate-batch, template)
│   ├── order_loss.py    # /api/order-loss/* (calculate)
│   ├── shopee_affiliate.py  # /api/shopee-affiliate/* (stores, upload, checker-matrix, report, comparison, download, delete)
│   └── ... (10 more)
├── services/            # Business logic (decoupled from routers)
│   ├── auth_logic.py    # JWT, password hashing, Google Sheets sync, user CRUD
│   ├── permission_guard.py  # require_tool_access() FastAPI dependency
│   ├── price_checker_logic.py  # Pricing calculation engine
│   ├── dingtalk_service.py     # DingTalk webhook notifications
│   └── ... (12 more logic files)
```

### Environment Variables (Cloud Run)
| Var | Value | Set via |
|---|---|---|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_e1Jl3rWoTcAR@ep-withered-butterfly-ao66aczs-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` | Render env vars / `--set-env-vars` |
| `JWT_SECRET` | default hardcoded (should move to env) | ⚠️ TODO |
| `DINGTALK_WEBHOOK_URL` | (optional) | env var |
| `DINGTALK_SECRET` | (optional) | env var |

---

## 8. DEPLOYMENT & INFRA

### Cloud Run Services
| Service | Region | URL |
|---|---|---|
| `anti-gravity` (BE) | asia-southeast1 | `https://anti-gravity-123563250077.asia-southeast1.run.app` |
| `frontend-anti-gravity` (FE) | asia-southeast1 | `https://frontend-anti-gravity-123563250077.asia-southeast1.run.app` |

### Manual Deploy (kalau CI/CD error)
```bash
# Backend
cd ~/anti-gravity/backend && gcloud run deploy anti-gravity --source . --region asia-southeast1 --allow-unauthenticated --set-env-vars="DATABASE_URL=postgresql://dena_admin:AntiGrav2026Secure@34.126.76.58:5432/antigravity_db"

# Frontend
cd ~/anti-gravity/frontend && gcloud run deploy frontend-anti-gravity --source . --region asia-southeast1 --allow-unauthenticated
```

### VPS PostgreSQL Config
- `listen_addresses = '*'` (postgresql.conf)
- `host all all 0.0.0.0/0 md5` (pg_hba.conf)
- GCP Firewall rule: `allow-postgres` → TCP 5432 dari 0.0.0.0/0

### GCP Firewall Rules
| Rule | Protocol | Port | Source |
|---|---|---|---|
| `allow-postgres` | TCP | 5432 | 0.0.0.0/0 |
| `default-allow-http` | TCP | 80 | 0.0.0.0/0 |

---

## 9. DATA SYNC FLOW

### User Sync (Google Sheets → PostgreSQL)
```
Google Sheets "Account" tab → POST /api/auth/sync-users → TRUNCATE account_users → INSERT all rows
```
- Trigger: Manual (tombol "Refresh Users" di login page)
- ⚠️ TRUNCATE dulu, jadi semua user di-replace

### Price Sync (Google Sheets → PostgreSQL)  
```
Google Sheets "Price" + "All_Name" tabs → POST /api/price-checker/sync-neon → TRUNCATE freemir_price + freemir_name → INSERT
```
- Trigger: Manual (tombol "Sync Prices 🔄" di Price Checker)
- ⚠️ Harus dilakukan setelah deploy baru atau kalau harga berubah

### Shopee Affiliate Data (CSV Upload → PostgreSQL)
```
Upload CSV → POST /api/shopee-affiliate/upload → Parse + INSERT ke shopee_aff_* tables
```
- Trigger: Manual upload di halaman Shopee Affiliate
- 3 tipe: conversion, product, creator
- Data di-append (bukan truncate), bisa dihapus per tanggal

---

## 10. POTENSI MASALAH & SOLUSI

| # | Masalah | Dampak | Solusi |
|---|---|---|---|
| 1 | **Cloud Run cold start** | Login/request pertama lambat 10-30 detik | Set `min-instances=1` di Cloud Run settings |
| 2 | **VPS PostgreSQL terbuka ke internet** | Security risk (port 5432 open) | Restrict IP range di firewall, atau gunakan Cloud SQL Auth Proxy |
| 3 | **JWT secret hardcoded** | Token bisa di-forge kalau source code bocor | Pindah ke env var `JWT_SECRET` di Cloud Run |
| 4 | **Password hash SHA-256 tanpa salt** | Rentan rainbow table attack | Migrate ke bcrypt |
| 5 | **credentials.json tidak di git** | Kalau re-deploy bersih, Google Sheets akses hilang | Upload ke GCP Secret Manager + mount di Cloud Run |
| 6 | **Data harga stale** | User pakai harga lama kalau lupa sync | Buat auto-sync terjadwal (cron / Cloud Scheduler) |
| 7 | **VPS e2-micro sangat kecil** | Kalau database besar, performance turun | Upgrade ke e2-small atau e2-medium |
| 8 | **Neon DB free tier limits** | 512MB storage, 191 compute hours/bulan | Sudah pindah ke VPS PostgreSQL ✅ |
| 9 | **CORS allow_origins=["*"]** | Security risk di production | Restrict ke frontend URL saja |
| 10 | **Token di localStorage** | Rentan XSS attack | Consider httpOnly cookie |

---

## 11. QUICK REFERENCE COMMANDS

```bash
# === LOKAL (PowerShell) ===
# Push changes (auto-trigger deploy via CI/CD)
git add -A; git commit -m "message"; git push origin main

# === CLOUD SHELL ===
# Manual deploy backend
cd ~/anti-gravity/backend && gcloud run deploy anti-gravity --source . --region asia-southeast1 --allow-unauthenticated

# Manual deploy frontend
cd ~/anti-gravity/frontend && gcloud run deploy frontend-anti-gravity --source . --region asia-southeast1 --allow-unauthenticated

# Check Cloud Run logs
gcloud run services logs read anti-gravity --region asia-southeast1 --limit 20

# === VPS (SSH) ===
# Connect ke PostgreSQL
psql -U dena_admin -d antigravity_db

# Check tabel
psql -U dena_admin -d antigravity_db -c "\dt"

# Restart PostgreSQL
sudo systemctl restart postgresql

# === API ENDPOINTS (Testing) ===
# Health check
curl https://anti-gravity-123563250077.asia-southeast1.run.app/

# Sync users
curl -X POST https://anti-gravity-123563250077.asia-southeast1.run.app/api/auth/sync-users

# Test Google Sheets connection
curl https://anti-gravity-123563250077.asia-southeast1.run.app/api/auth/test-sheet
```

---

## 12. FILE PENTING YANG SERING DI-EDIT

| File | Fungsi | Catatan |
|---|---|---|
| `frontend/src/api.js` | Axios config + token interceptor | Jangan hapus interceptor! |
| `frontend/src/App.jsx` | Routes + permission gates | Tambah route baru di sini |
| `frontend/src/layout/MainLayout.jsx` | Sidebar menu + navigation | Tambah menu item di sini |
| `backend/main.py` | FastAPI app + router includes | Tambah router baru di sini |
| `backend/models.py` | SQLAlchemy models | Tambah model → restart → auto-create table |
| `backend/services/auth_logic.py` | Auth + JWT + user sync | TOOL_KEYS array harus match dengan Google Sheets |
| `backend/services/permission_guard.py` | Permission dependency | Jangan ubah logic _extract_token |
| `cloudbuild.yaml` | CI/CD config | Deploy BE dulu, baru FE |
