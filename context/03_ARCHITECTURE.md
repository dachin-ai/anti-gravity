# 3. SYSTEM ARCHITECTURE

## 🏛️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│                    localhost:5173 / prod domain                 │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │ Login Page   │  │ Dashboard       │  │ Audit Tool       │  │
│  └──────┬───────┘  └────────┬────────┘  └────────┬─────────┘  │
│         │                   │                    │              │
└─────────┼───────────────────┼────────────────────┼──────────────┘
          │                   │                    │
          └───────────────────┼────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 │   axios HTTP Client     │
                 │ (sends JWT in header)   │
                 └────────────┬────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                            │
│                  localhost:8000 / Cloud Run                     │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │  AUTH ROUTER     │  │  AUDIT ROUTER    │                   │
│  │ ────────────────│  │ ──────────────── │                   │
│  │ POST /login     │  │ POST /audit/run  │                   │
│  │ POST /verify    │  │ GET /audit/report│                   │
│  │ POST /sync      │  │ POST /audit/download                │
│  └────────┬────────┘  └────────┬─────────┘                   │
│           │                    │                              │
│  ┌────────▼────────────────────▼────┐                        │
│  │   DEPENDENCY LAYER               │                        │
│  │   - JWT verification             │                        │
│  │   - DB session injection          │                        │
│  │   - Rate limiting checks          │                        │
│  └────────┬─────────────────────────┘                        │
│           │                                                    │
│  ┌────────▼──────────────┬──────────────────┐               │
│  │ AUTH LOGIC            │ ORDER AUDIT      │               │
│  │ ──────────────        │ LOGIC            │               │
│  │ - login()             │ ──────────────   │               │
│  │ - sync_users()        │ - run_audit()    │               │
│  │ - verify_token()      │ - generate_excel │               │
│  │ - get_cached_users()  │ - evaluate_judge │               │
│  └────────┬──────────────┴────────┬─────────┘               │
│           │                       │                          │
│  ┌────────▼─────────────────────────────┐                  │
│  │   PRICE CHECKER LOGIC               │                  │
│  │   - lookup_price()                  │                  │
│  │   - get_bundle_discount()           │                  │
│  │   - price_cache (214 SKU)           │                  │
│  └────────┬─────────────────────────────┘                  │
│           │                                                 │
└───────────┼─────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DATA LAYER                                    │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │    SQLAlchemy ORM + Connection Pool (20 conn)           │  │
│ │    - pool_size=20                                        │  │
│ │    - max_overflow=10                                     │  │
│ │    - pool_recycle=3600                                   │  │
│ └──────────┬───────────────────────────────────────────────┘  │
│            │                                                    │
└────────────┼────────────────────────────────────────────────────┘
             │
       ┌─────┴──────────────┐
       │                    │
       ▼                    ▼
┌─────────────────┐  ┌────────────────────────────┐
│   PostgreSQL    │  │  External APIs             │
│   Database      │  │ ──────────────             │
│                 │  │ - Google Sheets (user sync)│
│ VPS:            │  │ - DingTalk (notifications) │
│ 34.126.76.58    │  │ - TikTok Ads (future)      │
│ Port: 5432      │  │ - Shopee Webhook (orders)  │
│ DB: antigravity │  └────────────────────────────┘
│ 214 SKU cached  │
└─────────────────┘
```

---

## 🔄 Request Flow (Detailed)

### User Login Flow

```
1. FRONTEND
   User input: email + password
   │
   ├─→ POST /api/auth/login
   │   {email: "user@example.com", password: "secret123"}
   │
   ▼

2. BACKEND - AUTH ROUTER
   routers/auth.py:login()
   │
   ├─→ GET dependencies (DB session injected)
   │
   ▼

3. BUSINESS LOGIC
   services/auth_logic.py:login_user_optimized()
   │
   ├─→ Query: users.ilike(email)  # Indexed columnn → ~5-10ms
   │
   ├─→ Check: password hash match
   │   (Using bcrypt/argon2)
   │
   ├─→ If valid: Generate JWT token
   │   payload: {id, email, role, exp: 24 hours}
   │   signed with JWT_SECRET
   │
   ├─→ Update: last_login_at timestamp
   │
   ▼

4. RESPONSE
   ✅ Return JWT token (valid 24 hours)
   Error messages if:
   - User tidak ditemukan
   - Password salah
   - User inactive

5. FRONTEND
   Store JWT in localStorage
   Add JWT to all future requests:
   Headers: {Authorization: "Bearer <JWT>"}
```

**Time Breakdown:**
- DB lookup: ~5-10ms
- Password verify: ~50-100ms
- JWT generation: ~5ms
- Total: ~60-115ms per request
- **Visible to user after optimization:** 20-30 sec (multiple requests + network)

---

### Order Audit Flow

```
1. FRONTEND
   User uploads Excel file
   │
   ├─→ POST /api/audit/run
   │   multipart: file, format: "profit_review"
   │
   ▼

2. BACKEND - AUDIT ROUTER
   routers/audit.py:run_audit()
   │
   ├─→ Validate JWT token (middleware)
   │
   ├─→ Parse Excel file dengan pandas
   │
   ├─→ Pass to order_loss_logic
   │
   ▼

3. BUSINESS LOGIC - MAIN AUDIT
   services/order_loss_logic.py:run_order_loss_audit()
   │
   ├─→ Step 1: Column Mapping
   │   df.columns = df.columns.str.strip()  # CRITICAL!
   │   Find actual column names (flexible matching)
   │   
   ├─→ Step 2: Data Cleaning
   │   - Convert currency strings to int
   │   - Handle NaN values
   │   - Clean SKU lists (split by +,-,|,comma)
   │   
   ├─→ Step 3: Price Lookup
   │   Loop each order → lookup in price database
   │   - Get "warning" price tier (default comparison)
   │   - Handle bundle discount (multi-SKU)
   │   - Check clearance status
   │   
   ├─→ Step 4: First Judge
   │   Calculate: Total Profit per order
   │   Rule: profit > 0 = "Safe", else "Need Review"
   │   
   ├─→ Step 5: Second Judge
   │   Calculate: Gap (setting_price - brand_price)
   │   Calculate: Voucher % (coupon / setting_price)
   │   Rules:
   │   - If gap < 0: "Need Review"
   │   - If voucher % > 3%: "Need Review"
   │   - Else: "Safe"
   │   
   ├─→ Step 6: Aggregate Results
   │   Group by: Order, Product, Store
   │   Calculate: Sales Loss, After-sales Loss, Total Profit
   │   
   ├─→ Step 7: Generate Excel
   │   4 sheets:
   │   - Raw Data (original data)
   │   - By Order (group by order number)
   │   - By Product (group by SKU)
   │   - By Store (group by store)
   │   
   │   Formatting:
   │   - Header: Blue background
   │   - Losses: Orange/Red highlighting
   │   - Profits: Green highlighting
   │   - Numbers: Formatted with comma (1,000)
   │
   ▼

4. RESPONSE
   ✅ Return:
   {
     "total_orders": 60,
     "total_transactions": 114,
     "safe_orders": 9,
     "review_orders": 51,
     "sales_loss": -1040312,
     "total_profit": 868517,
     "final_profit": -171795
   }
   
   + Excel file (bytes) untuk download

5. ERROR HANDLING
   If missing required columns:
   → Helpful error message with available columns
   
   If data parsing fails:
   → Graceful fallback (e.g., set profit to 0)
   
   If price lookup fails:
   → Mark as "No price data" (not included in audit)

```

**Time Breakdown:**
- Excel parsing: ~500ms
- Price lookup (214 SKU): ~300ms
- Calculation & grouping: ~500ms
- Excel generation: ~600ms
- Total: ~2.0 seconds

---

### User Sync Flow (Background)

```
TRIGGER: Every 5 minutes OR manual POST /api/auth/sync-users

1. CACHE CHECK
   Check: Is cached data < 5 minutes old?
   
   Yes → Return cached list (zero API calls!)
   No  → Proceed to API call

2. GOOGLE SHEETS API
   gspread.authorize() with service account
   
   Fetch: User list sheet
   │
   ├─→ (If error) Use stale cache (fallback mechanism)
   │   Log warning
   │   Return last known good data
   │
   ▼

3. INCREMENTAL UPDATE (Optimization!)
   Instead of: DELETE ALL + INSERT ALL
   Do:
   
   ├─→ Query current users in DB
   ├─→ Compare with sheet data
   ├─→ Only UPDATE changed records
   └─→ Only INSERT new records
   
   (Much faster for large user bases)

4. CACHE
   Remember:
   - User list
   - Timestamp
   - Cache valid for 5 minutes

5. RESULT
   21 users synced from Google Sheets
   Ready for login attempts
```

**Performance:**
- With cache: ~5ms (100x faster!)
- Without cache: ~1-2 sec (API call)
- DB update: ~200ms (incremental)

---

## 🗃️ Data Persistence & Session Management

### Session Lifecycle

```
LOGIN (POST /api/auth/login)
    │
    ├─→ DB Session created (from pool)
    ├─→ User query executed
    ├─→ JWT token generated
    ├─→ DB Session closed (returned to pool)
    │
    ▼
WAIT (Frontend stores JWT in localStorage)
    │
    ├─→ JWT valid for 24 hours
    │
    ▼
AUTHENTICATED REQUESTS (Using JWT)
    │
    ├─→ POST /api/audit/run (with JWT header)
    ├─→ DB Session created
    ├─→ JWT verified (checked claims)
    ├─→ User lookup (from token claims)
    ├─→ Audit logic runs
    ├─→ Excel generated
    ├─→ DB Session closed
    │
    ▼
LOGOUT (Manual OR 24 hours)
    │
    ├─→ JWT expires
    ├─→ Frontend removes JWT
    ├─→ User must login again
```

### Connection Pool Lifecycle

```
APP START
    │
    ├─→ Create ConnectionPool (size=20)
    │
    ▼
REQUEST 1: User 1 Login
    │
    ├─→ Get connection from pool (now 19 available)
    ├─→ Execute DB query
    ├─→ Return connection to pool (now 20 available)
    │
    ▼
REQUEST 2-20: Concurrent Users
    │
    ├─→ Get connections from pool (up to 20)
    ├─→ Simultaneous execution
    ├─→ Return connections as finished
    │
    ▼
REQUEST 21+: Burst Traffic
    │
    ├─→ Pool exhausted (all 20 busy)
    ├─→ Create overflow connections (up to 10 more)
    ├─→ Handle up to 30 concurrent requests
    ├─→ Return overflow connections quickly
    │
    ▼
IDLE CONNECTIONS
    │
    ├─→ Connection age > 3600 sec (1 hour)
    ├─→ Recycle connection (close + reopenit)
    └─→ Prevents stale connection issues on VPS
```

---

## 🔗 API Contract & Data Format

### Authentication Header

All requests (except /login) require:

```
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "Content-Type": "application/json"
}
```

### Error Response Format

```json
{
  "detail": "Error message here",
  "error_code": "INVALID_TOKEN",
  "timestamp": "2026-04-16T10:30:00Z"
}
```

---

## 📚 Related Documentation

- [AUTHENTICATION.md](04_AUTHENTICATION.md) - Auth system details
- [ORDER_LOSS_AUDIT.md](05_ORDER_LOSS_AUDIT.md) - Audit algorithm deep dive
- [API_ENDPOINTS.md](06_API_ENDPOINTS.md) - All endpoints spec
- [DEPLOYMENT.md](09_DEPLOYMENT.md) - Production deployment

---

**Next: Read [AUTHENTICATION.md](04_AUTHENTICATION.md) untuk understand auth optimizations**
