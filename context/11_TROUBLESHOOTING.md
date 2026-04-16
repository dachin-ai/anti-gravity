# 11. TROUBLESHOOTING GUIDE

## 🆘 Common Issues & Solutions

### Auth & Login Issues

#### Issue: Login takes 60+ seconds (or new user?)

**Symptoms:**
- Login button freezes for 60+ seconds
- User thinks it hung

**Root Causes (in order of likelihood):**
1. Connection pool too small (default 5)
2. No Google Sheets cache (API calls every time)
3. Multiple sequential DB queries

**Solutions:**

```python
# 1. Check pool size in database.py
# Should be 20, not 5
pool_size=20  ✅

# 2. Check cache in auth_logic.py
# Should use 5-minute cache
CACHE_DURATION = 300  ✅

# 3. Check login function
# Should use optimized version
def login_user_optimized():  ✅
```

**Verification:**
```bash
# Time a login
time curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Should be < 5 seconds (after optimization)
```

---

#### Issue: "Connection refused" error in logs

**Symptoms:**
```
ERROR: (psycopg2.OperationalError) could not connect to server
```

**Root Cause:**
- `DATABASE_URL` pointing to wrong host
- Likely `localhost:5432` instead of VPS IP

**Solution:**

```bash
# Check .env file
cat .env | grep DATABASE_URL

# Should be:
DATABASE_URL="postgresql://dena_admin:AntiGrav2026Secure@34.126.76.58:5432/antigravity_db"

# NOT:
DATABASE_URL="postgresql://...@localhost:5432/..."

# Fix and restart server
python -m uvicorn main:app --reload
```

---

#### Issue: "Token expired" error when calling API

**Symptoms:**
```json
{"detail": "Token expired"}
```

**Root Cause:**
- JWT token > 24 hours old
- User didn't login recently

**Solution:**
```javascript
// In frontend
if (error.status === 401) {
    localStorage.removeItem("access_token");
    window.location.href = "/login";  // Force re-login
}
```

---

### Order Audit Issues

#### Issue: "Missing required columns" error

**Symptoms:**
```json
{"detail": "Missing columns for: System Product Code, Store"}
```

**Root Cause:**
- Excel column names don't match expected names
- Often due to typos or different language versions

**Solution:**

```python
# Check your Excel has these columns:
Required:
- Store | 店铺
- Original Order Number | 原始单号
- System Product Code | 系统商品编码
- Online Product Code | 线上商品编码
- Product Detail Gross Profit | 商品明细毛利
- Product Detail Amount After Discount | 商品明细优惠后金额

Optional:
- Order allocated amount | 订单分摊金额 (for setting price)
- Seller Coupon | 卖家优惠券
```

---

#### Issue: Excel upload returns empty result

**Symptoms:**
```json
{
  "total_orders": 0,
  "safe_orders": 0,
  "review_orders": 0
}
```

**Root Causes:**
1. Column names have leading/trailing spaces
2. Data types are wrong (strings instead of numbers)
3. All rows filtered out due to missing amount

**Solution:**

```python
# 1. Auto-strip column spaces (already implemented)
df.columns = df.columns.str.strip()  ✅

# 2. Check data types in Excel
# Make sure Amount columns are numbers, not text

# 3. Verify at least one row has data
print(df.head())
print(df.dtypes)
```

---

#### Issue: "Truth value of Series is ambiguous"

**Symptoms:**
```
ValueError: The truth value of a Series is ambiguous. Use a.empty, a.bool(), a.item(), a.any() or a.all().
```

**Root Cause:**
- Comparing pandas Series directly (should compare scalar values)

**Example (Wrong):**
```python
if pct_voucher > 0.03:  # ❌ Series can't be used in if
    return "Need Review"
```

**Solution:**
```python
# Convert to scalar first
pct = float(pct_voucher) if pd.notna(pct_voucher) else 0
if pct > 0.03:  # ✅ Now works
    return "Need Review"
```

---

#### Issue: DataFrame aggregation returns wrong type

**Symptoms:**
```python
col_val = order_metrics['Order allocated amount']
# type(col_val) is DataFrame (not Series!)
order_metrics['Setting Price'] = col_val.astype(float)  # Error!
```

**Root Cause:**
- Aggregation sometimes returns DataFrame instead of Series
- Pandas behavior varies by situation

**Solution:**
```python
# Check type and extract
col_val = order_metrics['Order allocated amount']
if isinstance(col_val, pd.DataFrame):
    col_val = col_val.iloc[:, 0]  # Get first column
order_metrics['Setting Price'] = col_val.astype(float)  # ✅ Works
```

---

### Database Issues

#### Issue: "Connection pool exhausted"

**Symptoms:**
```
QueuePool limit exceeded
Connection timeout
```

**Root Cause:**
- Too many simultaneous requests
- Connection pool too small

**Solution:**

```python
# In database.py, increase pool size
engine = create_engine(
    DATABASE_URL,
    pool_size=20,        # ← Increase this
    max_overflow=10,     # ← And this
    pool_recycle=3600
)
```

**Current values:**
```
pool_size: 20      → 20 permanent connections
max_overflow: 10   → Up to 10 burst (total 30)
Result: Support 30+ concurrent users
```

---

#### Issue: "Idle connection error" after 1 hour

**Symptoms:**
```
Connection lost / Connection reset by peer
```

**Root Cause:**
- VPS drops idle connections after ~1 hour
- Pool doesn't recycle old connections

**Solution:**

```python
# In database.py
engine = create_engine(
    DATABASE_URL,
    pool_recycle=3600,   # ← Recycle every 1 hour
    pool_pre_ping=True   # ← Ping before using
)
```

---

#### Issue: Database queries very slow (>1 sec)

**Symptoms:**
```
User lookup takes 2+ seconds
Audit processing takes 10+ seconds
```

**Root Cause:**
- Missing database indexes
- Large table scans
- N+1 query problem

**Solution:**

```sql
-- Check indexes exist
\di  -- list all indexes

-- Create missing indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_order_number ON orders(original_order_number);
CREATE INDEX idx_prices_sku ON prices(sku);

-- Check query plan
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
```

---

### Google Sheets Integration Issues

#### Issue: "Permission denied" when syncing users

**Symptoms:**
```
gspread.exceptions.APIError: {'error': {'code': 403, 'message': 'Permission denied'}}
```

**Root Cause:**
- Service account doesn't have access to sheet
- Sheet name wrong
- Credentials file invalid

**Solution:**

```bash
# 1. Check service account email
# In credentials.json: "client_email": "service-account@project.iam.gserviceaccount.com"

# 2. Share Google Sheet with service account
# Open sheet → Share → Add service account email

# 3. Check sheet name matches code
# Code: client.open("user_list")  
# Sheet: Must be named exactly "user_list"

# 4. Test credentials
python -c "
import gspread
from google.oauth2.service_account import Credentials
creds = Credentials.from_service_account_file('credentials.json')
client = gspread.authorize(creds)
sh = client.open('user_list')
print('✓ Connected!')
"
```

---

#### Issue: User sync never happens (cache always used)

**Symptoms:**
```
21 users always same, never update
Last sync: 2 hours ago
```

**Root Cause:**
- Cache not expiring
- Sync endpoint not being called

**Solution:**

```python
# Check cache logic
now = time.time()
if now - _cached_users_timestamp < 300:  # 5 min
    return cached_users  # OK

# If "now" and "timestamp" are same value, cache never expires
# Should recalculate periodically

# Manual sync test
POST /api/auth/sync-users
# Check if counter increments
```

---

### Deployment Issues

#### Issue: Cloud Build fails

**Symptoms:**
```
Cloud Build Error: Step 1 failed
Docker build failed
```

**Check logs:**
```bash
# View Cloud Build logs
gcloud builds log <BUILD_ID>

# Common errors:
# 1. "Command not found" → pip install missing
# 2. "Module not found" → requirements.txt outdated
# 3. "Timeout" → Large dependencies, increase timeout

# Fix and retry
git push origin main  # Trigger again
```

---

#### Issue: Cloud Run service times out (30+ seconds)

**Symptoms:**
- API calls timeout
- Excel generation incomplete

**Solution:**

```bash
# Increase timeout (default 300 sec)
gcloud run services update anti-gravity \
  --timeout=600 \
  --region asia-southeast1-c
```

---

### General Performance Issues

#### Issue: Slow Excel downloads (>5 seconds)

**Symptoms:**
- Excel generation takes 5+ seconds
- User frustrated waiting

**Root Causes:**
1. Large Excel file (many rows)
2. Conditional formatting on every row
3. Inefficient column sizing

**Solutions:**

```python
# 1. Batch process rows
for i in range(start, end, 100):  # Process 100 at a time
    # Apply formatting
    
# 2. Simplify conditional formatting
# Instead of per-row, use ranges
ws.conditional_format('A2:Z1000', {...})

# 3. Limit formatting to needed columns only
# Not every column needs conditional format
```

---

#### Issue: High memory usage with large Excel files

**Symptoms:**
- Server runs out of memory
- Process killed

**Solution:**

```python
# 1. Limit Excel size
if len(df) > 10000:
    raise ValueError("Excel file too large (max 10,000 rows)")

# 2. Stream Excel instead of buffering
# Use io.BytesIO with chunks

# 3. Add memory monitoring
import tracemalloc
tracemalloc.start()
# ... run audit ...
current, peak = tracemalloc.get_traced_memory()
logger.info(f"Memory used: {peak / 1024 / 1024:.1f} MB")
```

---

## 🔍 Debugging Tips

### Enable Debug Logging

```python
# main.py
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Or via environment
ENVIRONMENT=development
LOG_LEVEL=DEBUG
```

### Database Query Logging

```python
# database.py
engine = create_engine(
    DATABASE_URL,
    echo=True  # Log all SQL statements
)
```

### Request Logging Middleware

```python
from starlette.middleware.base import BaseHTTPMiddleware

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        logger.info(f"{request.method} {request.url.path}")
        response = await call_next(request)
        logger.info(f"Response: {response.status_code}")
        return response

app.add_middleware(LoggingMiddleware)
```

---

## 📚 Related Files

- [ARCHITECTURE.md](03_ARCHITECTURE.md) - System understanding
- [DATABASE.md](02_DATABASE.md) - DB schema & setup
- [DEPLOYMENT.md](09_DEPLOYMENT.md) - Deployment issues

---

**Next: Read [12_QUICK_REFERENCE.md](12_QUICK_REFERENCE.md) for cheat sheet**
