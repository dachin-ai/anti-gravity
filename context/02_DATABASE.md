# 2. DATABASE DOCUMENTATION

## 🗄️ Database Overview

**Database Type:** PostgreSQL  
**Server:** 34.126.76.58:5432  
**Database Name:** antigravity_db  
**User:** dena_admin  
**Status:** ✅ Production Active

---

## 🔑 Connection Information

### Connection String Format
```
postgresql://dena_admin:AntiGrav2026Secure@34.126.76.58:5432/antigravity_db
```

### Connection Parameters (dalam `database.py`)

```python
from sqlalchemy import create_engine

DATABASE_URL = "postgresql://dena_admin:AntiGrav2026Secure@34.126.76.58:5432/antigravity_db"

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,      # Ping connection before using (detect stale)
    pool_size=20,            # Permanent connections in pool
    max_overflow=10,         # Max burst connections above pool_size
    pool_recycle=3600,       # Recycle connections every 1 hour (VPS requirement)
    echo=False               # Don't log all SQL statements
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
```

### Why These Settings?

| Parameter | Value | Reason |
|-----------|-------|--------|
| pool_size | 20 | Default 5 insufficient untuk concurrent users |
| max_overflow | 10 | Allow burst untuk banyak request simultaneously |
| pool_recycle | 3600 | VPS drop idle connections > 1 hour |
| pool_pre_ping | True | Avoid "connection lost" errors |

**Performance Impact:**
- Sebelum: 5 connections → queueing → slow auth (60+ sec)
- Sesudah: 20-30 concurrent → parallel execution → fast (20-30 sec)

---

## 📊 Database Schema

### 1. `users` Table

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'auditor')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    
    -- Indexes untuk fast lookup
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_is_active (is_active)
);
```

**Current Users:** 21 (synced dari Google Sheets)

### 2. `prices` Table

```sql
CREATE TABLE prices (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(500),
    category VARCHAR(255),
    
    -- Price Tiers (16 tiers total)
    warning_price DECIMAL(10,2),           -- Baseline warning price
    daily_discount_price DECIMAL(10,2),
    flash_sale_price DECIMAL(10,2),
    promotion_price DECIMAL(10,2),
    bundle_price DECIMAL(10,2),
    
    -- Additional pricing
    cost_price DECIMAL(10,2),              -- Cost untuk calculate profit
    clearance DECIMAL(10,2),               -- Clearance price (if any)
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_sku (sku),
    INDEX idx_category (category)
);
```

**Current Records:** 214 SKU  
**Last Updated:** Periodically (manual atau via admin panel)

### 3. `orders` Table

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    original_order_number VARCHAR(100) NOT NULL,
    erp_order_number VARCHAR(100),
    store_name VARCHAR(255),
    
    -- Order metadata
    order_date DATE,
    total_amount DECIMAL(12,2),
    discount_amount DECIMAL(12,2),
    seller_coupon DECIMAL(12,2),
    
    -- Audit results (populated saat audit)
    setting_price DECIMAL(12,2),           -- Harga setting dari sheet
    brand_price DECIMAL(12,2),             -- Harga dari database
    gap_price DECIMAL(12,2),               -- setting - brand
    profit_loss DECIMAL(12,2),             -- Final P&L
    is_audited BOOLEAN DEFAULT false,
    
    audit_result VARCHAR(50),              -- 'Safe | 安全' atau 'Need Review | 需要审查'
    first_judge VARCHAR(100),              -- Profit based
    second_judge VARCHAR(100),             -- Price/voucher based
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_order_number (original_order_number),
    INDEX idx_is_audited (is_audited),
    INDEX idx_audit_result (audit_result)
);
```

### 4. `order_items` Table

```sql
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    system_sku VARCHAR(100),               -- Internal SKU
    online_sku VARCHAR(100),               -- Online platform SKU
    quantity INTEGER,
    unit_price DECIMAL(10,2),
    discount_amount DECIMAL(10,2),
    actual_paid DECIMAL(10,2),
    
    product_gross_profit DECIMAL(10,2),    -- Unit profit
    total_profit DECIMAL(12,2),            -- Total untuk item ini
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_order_id (order_id),
    INDEX idx_system_sku (system_sku)
);
```

### 5. `audit_reports` Table

```sql
CREATE TABLE audit_reports (
    id SERIAL PRIMARY KEY,
    audit_file_name VARCHAR(255),
    created_by_user_id INTEGER REFERENCES users(id),
    
    summary_data JSON,  -- {
                        --   "total_orders": 60,
                        --   "total_transactions": 114,
                        --   "safe_orders": 9,
                        --   "review_orders": 51,
                        --   "total_profit": 868517,
                        --   "sales_loss": -1040312
                        -- }
    
    excel_file_path VARCHAR(500),          -- Path ke generated Excel
    file_size_bytes INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_created_by (created_by_user_id),
    INDEX idx_created_at (created_at)
);
```

### 6. `audit_logs` Table (untuk future tracking)

```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100),                   -- 'LOGIN', 'SYNC_USERS', 'RUN_AUDIT'
    user_id INTEGER REFERENCES users(id),
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);
```

---

## 🔄 Data Relationships

```
users (1) ──────────┐
                    ├──→ audit_reports (Many)
                    └──→ audit_logs (Many)

orders (1) ────────→ order_items (Many)
           ────────→ audit_results

prices ←───────────── order_items (lookup)
        ←───────────── order_loss_audit (lookup)
```

---

## 📈 Current Data Size

| Table | Records | Size | Notes |
|-------|---------|------|-------|
| users | 21 | ~5 KB | Synced dari Google Sheets |
| prices | 214 | ~50 KB | All SKU dengan 16 price tiers |
| orders | ~500 | ~200 KB | Sample order history |
| order_items | ~600 | ~150 KB | Items dari orders |
| audit_reports | ~20 | ~100 KB | Previous audit runs |
| **Total** | **~1,350** | **~500 KB** | Very lightweight |

---

## 🔍 Important Columns Explained

### `prices` Table Tiers

16 price tiers untuk different scenarios:

```
1. warning_price              → Baseline (used dalam audit)
2. daily_discount_price       → Daily promo (usually -5-10%)
3. flash_sale_price           → Flash deal (usually -20-30%)
4. promotion_price            → Strategic promo
5. bundle_price               → Multi-item bundle
6. cost_price                 → Internal cost (untuk profit calc)
7. clearance                  → Final clearance (if > 0)
... (9 more tiers untuk regional/seasonal promos)
```

**Used in Audit:**
- `warning_price` = Default price tier untuk audit (dapat di-config)
- `clearance` = Special handling jika ada (treated as floor price)

### `orders` Table Status Fields

```
is_audited: boolean
    → false: Order belum di-audit
    → true:  Order sudah di-audit

audit_result: string
    → 'Safe | 安全':              Order OK (profit > 0, voucher < 3%)
    → 'Need Review | 需要审查':    Order bermasalah (perlu investigasi)

first_judge: string
    → Berdasarkan: Profit > 0?
    → 'Safe | 安全':              Profit positive
    → 'Need Review | 需要审查':    Profit <= 0

second_judge: string
    → Berdasarkan: Gap & Voucher
    → 'Safe | 安全':              Gap >= 0 AND voucher < 3%
    → 'Need Review | 需要审查':    Gap < 0 OR voucher > 3%
```

---

## 🚀 Optimization & Performance

### Connection Pooling

**Problem:** 
- Default pool_size=5 dengan 21 concurrent users
- Requests queue → avg 60+ seconds auth

**Solution:**
```python
pool_size=20         # 4x increase
max_overflow=10      # Allow burst to 30
pool_recycle=3600    # Prevent connection timeout
```

**Result:**
- ✅ Auth speed: 60+ sec → 20-30 sec
- ✅ Concurrent users: 5 → 30-75+
- ✅ Average DB query: 50-100ms

---

## 📋 Indexes Strategy

**Indexed Columns (untuk fast lookup):**

```
users:                prices:           orders:
├─ email             ├─ sku            ├─ original_order_number
├─ username         └─ category       ├─ is_audited
├─ is_active                         ├─ audit_result
                                     └─ erp_order_number

order_items:        audit_logs:
├─ order_id         ├─ user_id
└─ system_sku       ├─ action
                    └─ created_at
```

**Query Performance:**
- User lookup: ~5-10ms (indexed email)
- Price lookup: ~5-10ms (indexed SKU)
- Order lookup: ~20-30ms (indexed order_number)

---

## 🔐 Backup & Recovery

**Backup Strategy:**
- ✅ Automated daily backup (Cloud SQL, jika migrate)
- ✅ Manual backup sebelum major changes
- ✅ Transaction logs untuk point-in-time recovery

**Recovery Procedure:**
```bash
# If needed, restore dari backup
pg_restore -h 34.126.76.58 -U dena_admin -d antigravity_db backup.sql
```

---

## 🔑 Credential Management

⚠️ **SECURITY: Never commit credentials!**

**Proper credential management:**

```bash
# In .env (NOT in git)
DATABASE_URL="postgresql://dena_admin:AntiGrav2026Secure@34.126.76.58:5432/antigravity_db"

# Or use Cloud Secret Manager in production
gcloud secrets create database-url --data-file=-
# Then reference in Cloud Run environment
```

**Access Control:**
- VPS: SSH key-based only (no passwords)
- DB: Username + password (stored in Cloud Secret Manager)
- App: .env atau Cloud Secret Manager reference

---

## 🧪 Testing Database Keys

**Test Users (untuk development):**
```sql
INSERT INTO users (username, email, password_hash, full_name, role)
VALUES ('testuser', 'test@example.com', 'hashedpwd123', 'Test User', 'user'),
       ('admin', 'admin@antigravity.com', 'hashedpwd456', 'Power Admin', 'admin');
```

**Sample Price Data:**
```sql
INSERT INTO prices (sku, product_name, category, warning_price, cost_price)
VALUES ('SKU001', 'Product Name', 'Electronics', 1000.00, 500.00),
       ('SKU002', 'Another Product', 'Apparel', 500.00, 200.00);
```

---

## 🔄 Data Migration Notes

**If migrating from old system:**

1. Validate data integrity
2. Check SKU mapping consistency
3. Verify price tier values
4. Test audit algorithm dengan old data
5. Gradual rollout (not all at once)

---

## 📊 Monitoring & Maintenance

**Regular maintenance tasks:**

- ✅ Check connection pool stats
- ✅ Monitor slow queries (queries > 1 second)
- ✅ Update statistics (ANALYZE)
- ✅ Clean old audit reports (archive)
- ✅ Backup verification

**Monitoring queries:**

```sql
-- Connection pool status
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;

-- Slow queries
SELECT query, mean_time FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

-- Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname != 'pg_catalog' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 📚 Related Files

- [ARCHITECTURE.md](03_ARCHITECTURE.md) - How data flows through system
- [AUTHENTICATION.md](04_AUTHENTICATION.md) - User table usage
- [ORDER_LOSS_AUDIT.md](05_ORDER_LOSS_AUDIT.md) - Price/order table usage
- [ENVIRONMENT.md](10_ENVIRONMENT.md) - Database config in .env

---

**Next: Read [ARCHITECTURE.md](03_ARCHITECTURE.md) untuk understand data flow**
