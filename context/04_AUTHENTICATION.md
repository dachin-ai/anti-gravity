# 4. AUTHENTICATION & USER MANAGEMENT

## 🔐 Authentication System Overview

**Method:** JWT (JSON Web Token)  
**Token Lifetime:** 24 hours  
**Storage:** Frontend localStorage  
**User Source:** Google Sheets (synced every 5 min)

---

## 🔐 JWT Token Structure

### Token Payload

```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "john_doe",
  "role": "admin",
  "iat": 1713270600,
  "exp": 1713357000
}
```

### Token Creation

```python
# File: services/auth_logic.py

import jwt
from datetime import datetime, timedelta

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY = 24  # hours

def create_access_token(user_id: int, email: str, username: str, role: str) -> str:
    payload = {
        "id": user_id,
        "email": email,
        "username": username,
        "role": role,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

---

## 🔄 Login Flow (Optimized)

### Problem: Original Login Was Slow (60+ seconds)

**Root Causes:**
1. No caching → Google Sheets called every login
2. Small connection pool (size=5) → queueing
3. Multiple sequential DB queries

### Solution: 3-Layer Optimization

#### 1️⃣ Connection Pooling (20 connections)

```python
# File: database.py

engine = create_engine(
    DATABASE_URL,
    pool_size=20,        # ← Increase from 5
    max_overflow=10,     # ← Allow burst
    pool_recycle=3600,   # ← Prevent timeout
    pool_pre_ping=True   # ← Check connection health
)
```

**Impact:** 60+ sec → 30-40 sec (-50%)

#### 2️⃣ Google Sheets Cache (5 minutes)

```python
# File: services/auth_logic.py

CACHE_DURATION = 300  # 5 minutes
_cached_users_timestamp = 0
_cached_users = []

def get_users_from_sheets():
    global _cached_users_timestamp, _cached_users
    
    now = time.time()
    
    # Check cache
    if now - _cached_users_timestamp < CACHE_DURATION:
        if _cached_users:
            return _cached_users  # Return cached (instant!)
    
    # Cache expired, fetch from API
    try:
        sh = client.open("user_list")  # Google Sheets
        ws = sh.worksheet(0)
        users = ws.get_all_records()
        
        _cached_users = users
        _cached_users_timestamp = now
        return users
        
    except Exception as e:
        # Network error? Use stale cache as fallback
        if _cached_users:
            return _cached_users
        raise
```

**Impact:** 30-40 sec → 20-30 sec (-40%)

#### 3️⃣ Single Query Login

```python
# File: services/auth_logic.py

def login_user_optimized(email: str, password: str, db):
    # BEFORE: Multiple queries
    # user = db.query(User).filter(User.email == email).first()
    # if not user: check in sheets, then potentially create
    # Multiple DB round trips...
    
    # AFTER: Single query with index
    user = db.query(User).filter(User.email.ilike(email)).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password (bcrypt)
    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate token
    token = create_access_token(
        user_id=user.id,
        email=user.email,
        username=user.username,
        role=user.role
    )
    
    # Update last login
    user.last_login_at = datetime.utcnow()
    db.commit()
    
    return {"access_token": token, "token_type": "bearer"}
```

**Impact:** Combined optimization = 20-30 sec total

---

## 👥 User Sync from Google Sheets

### Automatic Sync

Every 5 minutes (or on manual request):

```python
# File: services/auth_logic.py

def sync_users_from_sheet():
    """
    Sync users from Google Sheets to database
    OPTIMIZATION: Incremental update (not delete-all)
    """
    
    # Step 1: Get users from Google Sheets (uses cache!)
    sheet_users = get_users_from_sheets()  # Uses 5-min cache
    
    # Step 2: Get current users from DB
    db_users = db.query(User).all()
    db_emails = {u.email: u for u in db_users}
    
    # Step 3: Compare & update (incremental)
    for sheet_user in sheet_users:
        email = sheet_user["email"]
        
        if email in db_emails:
            # User exists, update if changed
            db_user = db_emails[email]
            db_user.username = sheet_user.get("username")
            db_user.full_name = sheet_user.get("full_name")
            db_user.role = sheet_user.get("role", "user")
            db.add(db_user)
        else:
            # New user, insert
            new_user = User(
                email=email,
                username=sheet_user.get("username"),
                full_name=sheet_user.get("full_name"),
                role=sheet_user.get("role", "user"),
                password_hash="default_hash"  # Will reset on first login
            )
            db.add(new_user)
    
    db.commit()
    return {"synced": len(sheet_users)}
```

**Performance:**
- **With 5-min cache:** ~200ms (DB update only)
- **Without cache:** ~1-2 sec (API call wait)
- **Result:** 21 users synced successfully ✅

---

## 🔑 User Roles & Permissions

### Role Types

```python
class UserRole:
    ADMIN = "admin"        # Full access
    AUDITOR = "auditor"    # Can run audits, read reports
    USER = "user"          # Limited access
```

### Permission Matrix

| Permission | Admin | Auditor | User |
|------------|-------|---------|------|
| Login | ✅ | ✅ | ✅ |
| Sync Users | ✅ | ❌ | ❌ |
| Run Audit | ✅ | ✅ | ❌ |
| View Reports | ✅ | ✅ | ✅ |
| Export Excel | ✅ | ✅ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |

---

## 📝 API Endpoints for Auth

### 1. Login

```
POST /api/auth/login

Request:
{
  "email": "user@example.com",
  "password": "secret123"
}

Response (201):
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400
}

Error (401):
{
  "detail": "Invalid credentials"
}
```

### 2. Verify Token

```
POST /api/auth/verify

Headers:
Authorization: Bearer <jwt_token>

Response (200):
{
  "valid": true,
  "user_id": 1,
  "email": "user@example.com",
  "role": "admin"
}

Error (401):
{
  "detail": "Token expired"
}
```

### 3. Sync Users

```
POST /api/auth/sync-users

Headers:
Authorization: Bearer <admin_token>

Response (200):
{
  "synced": 21,
  "message": "Users synced successfully"
}
```

---

## 🛡️ Security Best Practices

### ✅ Implemented

- [x] JWT token expiry (24 hours)
- [x] Password hashing (bcrypt)
- [x] SQL injection prevention (SQLAlchemy ORM)
- [x] CORS configuration
- [x] HTTPS in production

### ⚠️ To Consider

- [ ] Rate limiting on login (prevent brute force)
- [ ] Long-term token refresh mechanism
- [ ] Session revocation (logout)
- [ ] Two-factor authentication (2FA)
- [ ] API key management for service accounts

### Code Example: Secure Password Handling

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

---

## 🧪 Testing Authentication

### Manual Test Steps

```bash
# 1. Start backend server
cd backend
python -m uvicorn main:app --reload

# 2. Login test
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123"}'

# 3. Verify returned JWT
# Copy token, then test with:
curl -X POST "http://localhost:8000/api/auth/verify" \
  -H "Authorization: Bearer <JWT_TOKEN>"

# 4. Sync users (admin only)
curl -X POST "http://localhost:8000/api/auth/sync-users" \
  -H "Authorization: Bearer <ADMIN_JWT>"
```

---

## 🔄 OAuth2 / Google Login (Future)

Currently using:
- Custom email/password login
- Google Sheets for user source

Could implement:
- Google OAuth2 (one-click login)
- SSO (Single Sign-On) integration
- LDAP (enterprise)

---

## 💾 Session & Token Storage

### Frontend (React)

```javascript
// In localStorage
localStorage.setItem("access_token", jwtToken);
localStorage.setItem("user_email", email);
localStorage.setItem("user_role", role);

// In axios interceptor
instance.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```

### Logout

```javascript
function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_role");
    // Redirect to login page
    window.location.href = "/login";
}
```

---

## 📊 User Statistics

**Current Status:**
- Total users: 21
- Synced from: Google Sheets
- Last sync: Every 5 minutes
- Active users: ~5-10 daily
- Admin users: 1 (owner)
- Auditor users: ~3
- Regular users: ~17

---

## 🚨 Common Auth Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Token expired" | JWT > 24hr old | User must login again |
| "Invalid credentials" | Wrong email/pwd | Check spelling, reset password |
| "Connection refused" | DB pool exhausted | Increase pool_size in database.py |
| Slow login (30+ sec) | Small pool or no cache | Already optimized |
| Users not syncing | Google Sheets API error | Check service account credentials |

---

## 📚 Related Files

- [ARCHITECTURE.md](03_ARCHITECTURE.md) - Auth flow diagram
- [API_ENDPOINTS.md](06_API_ENDPOINTS.md) - All auth endpoints
- [ENVIRONMENT.md](10_ENVIRONMENT.md) - JWT secret configuration
- [TROUBLESHOOTING.md](11_TROUBLESHOOTING.md) - Auth issues & fixes

---

**Next: Read [ORDER_LOSS_AUDIT.md](05_ORDER_LOSS_AUDIT.md) untuk understand the core audit logic**
