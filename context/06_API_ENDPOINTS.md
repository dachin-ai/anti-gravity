# 6. API ENDPOINTS

## 📡 RESTful API Reference

**Base URL (Development):** `http://localhost:8000`  
**Base URL (Production):** `https://api.antigravity.cloud`  
**API Version:** v1

---

## 🔐 Authentication Endpoints

### POST /api/auth/login

Login dengan email dan password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

**Response (201):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwi...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

**Error (401):**
```json
{
  "detail": "Invalid credentials"
}
```

**Time:** ~60-115ms

---

### POST /api/auth/verify

Verify token validity dan get user info.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "valid": true,
  "user_id": 1,
  "email": "user@example.com",
  "username": "john_doe",
  "role": "admin"
}
```

**Error (401):**
```json
{
  "detail": "Token expired"
}
```

---

### POST /api/auth/sync-users

Manually trigger user sync dari Google Sheets.

**Headers:**
```
Authorization: Bearer <ADMIN_JWT>
Content-Type: application/json
```

**Response (200):**
```json
{
  "synced": 21,
  "message": "Users synced successfully",
  "timestamp": "2026-04-16T10:30:00Z"
}
```

**Permissions:** Admin only

**Time:** ~200ms (incremental) or ~1-2 sec (API call)

---

## 📊 Order Audit Endpoints

### POST /api/audit/run

Run order loss audit dengan Excel file upload.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

**Request Parameters:**
```
file: <binary Excel file>
format: "profit_review" | "pre_sale_review"
price_type: "Warning" | "Daily-Discount" | "Flash-Sale" (default: "Warning")
```

**Response (200):**
```json
{
  "total_orders": 60,
  "total_transactions": 114,
  "safe_orders": 9,
  "review_orders": 51,
  "sales_loss": -1040312,
  "aftersales_loss": 0,
  "total_profit": 868517,
  "final_profit": -171795,
  "file_name": "audit_result.xlsx",
  "timestamp": "2026-04-16T10:35:00Z"
}
```

**Error (400):**
```json
{
  "detail": "Missing required columns: System Product Code, Store"
}
```

**Time:** ~2-3 seconds per file

**Notes:**
- Excel column mapping automatically handles variations
- Column whitespace automatically stripped
- Returns both JSON summary + Excel file

---

### GET /api/audit/report/{report_id}

Get previous audit report details.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "report_id": 123,
  "created_at": "2026-04-16T10:35:00Z",
  "created_by": "user@example.com",
  "summary": {
    "total_orders": 60,
    "safe_orders": 9,
    "review_orders": 51,
    "final_profit": -171795
  },
  "file_path": "/reports/audit_result_20260416.xlsx"
}
```

---

### GET /api/audit/download/{report_id}

Download Excel file dari previous report.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Binary Excel file (4 sheets)

---

## 💰 Price Management Endpoints

### GET /api/prices

List all SKU dengan prices.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
```
?skip=0&limit=100
?category=Electronics
?sku=SKU001
```

**Response (200):**
```json
{
  "total": 214,
  "items": [
    {
      "sku": "SKU001",
      "product_name": "Product A",
      "category": "Electronics",
      "warning_price": 1000000,
      "daily_discount_price": 950000,
      "cost_price": 500000
    },
    ...
  ]
}
```

---

### POST /api/prices

Create new SKU (Admin only).

**Headers:**
```
Authorization: Bearer <ADMIN_JWT>
Content-Type: application/json
```

**Request:**
```json
{
  "sku": "SKU_NEW",
  "product_name": "New Product",
  "category": "Electronics",
  "warning_price": 1000000,
  "cost_price": 500000,
  "daily_discount_price": 950000
}
```

**Response (201):**
```json
{
  "id": 215,
  "sku": "SKU_NEW",
  "message": "Price created successfully"
}
```

---

### PUT /api/prices/{sku}

Update SKU price (Admin only).

**Headers:**
```
Authorization: Bearer <ADMIN_JWT>
Content-Type: application/json
```

**Request:**
```json
{
  "warning_price": 1100000,
  "daily_discount_price": 1050000
}
```

**Response (200):**
```json
{
  "sku": "SKU001",
  "message": "Price updated successfully"
}
```

---

## 👥 User Management Endpoints

### GET /api/users

List all users (Admin only).

**Headers:**
```
Authorization: Bearer <ADMIN_JWT>
```

**Response (200):**
```json
{
  "total": 21,
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "username": "john_doe",
      "full_name": "John Doe",
      "role": "admin",
      "last_login": "2026-04-16T10:00:00Z"
    },
    ...
  ]
}
```

---

### POST /api/users

Create new user (Admin only).

**Headers:**
```
Authorization: Bearer <ADMIN_JWT>
Content-Type: application/json
```

**Request:**
```json
{
  "email": "newuser@example.com",
  "username": "newuser",
  "full_name": "New User",
  "password": "initial123",
  "role": "auditor"
}
```

**Response (201):**
```json
{
  "id": 22,
  "email": "newuser@example.com",
  "message": "User created successfully"
}
```

---

### PUT /api/users/{user_id}

Update user (Admin only).

**Headers:**
```
Authorization: Bearer <ADMIN_JWT>
Content-Type: application/json
```

**Request:**
```json
{
  "full_name": "Updated Name",
  "role": "admin"
}
```

**Response (200):**
```json
{
  "id": 1,
  "message": "User updated successfully"
}
```

---

### DELETE /api/users/{user_id}

Delete user (Admin only, cannot delete self).

**Headers:**
```
Authorization: Bearer <ADMIN_JWT>
```

**Response (200):**
```json
{
  "message": "User deleted successfully"
}
```

---

## 🔔 Notification Endpoints

### POST /api/dingtalk/send

Send notification ke DingTalk group (Internal).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request:**
```json
{
  "title": "Order Audit Results",
  "message": "51 orders need review",
  "severity": "warning"
}
```

**Response (200):**
```json
{
  "sent": true,
  "message_id": "msg123"
}
```

---

## 📋 Health Check Endpoints

### GET /api/health

Check API health status.

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-16T10:30:00Z",
  "database": "connected",
  "version": "1.0.0"
}
```

---

### GET /api/stats

Get system statistics (Admin only).

**Headers:**
```
Authorization: Bearer <ADMIN_JWT>
```

**Response (200):**
```json
{
  "total_users": 21,
  "total_skus": 214,
  "total_orders_audited": 142,
  "db_connections_active": 12,
  "cache_hit_rate": 0.92
}
```

---

## 🔑 Common Headers

**All authenticated requests require:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## 📊 HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful GET/PUT |
| 201 | Created | POST successful |
| 400 | Bad Request | Missing fields, invalid data |
| 401 | Unauthorized | Invalid or expired JWT |
| 403 | Forbidden | Admin only, insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Unexpected error |

---

## ⏱️ Performance Targets

| Endpoint | Target | Actual |
|----------|--------|--------|
| /login | 5 sec | 2-3 sec |
| /audit/run | 5 sec | 2-3 sec |
| /prices | 1 sec | 100-200ms |
| /users | 1 sec | 100-150ms |

---

## 🧪 Testing API with curl

```bash
# 1. Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123"}'

# 2. Extract JWT from response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 3. Test audit
curl -X POST http://localhost:8000/api/audit/run \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@order_data.xlsx" \
  -F "format=profit_review"

# 4. Get prices
curl -X GET "http://localhost:8000/api/prices?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔄 Rate Limiting (Future)

**Planned:**
- Login: 5 attempts per minute per IP
- Audit: 10 runs per hour per user
- API: 100 requests per minute per user

---

## 📚 Related Files

- [ARCHITECTURE.md](03_ARCHITECTURE.md) - Request flow diagrams
- [AUTHENTICATION.md](04_AUTHENTICATION.md) - Auth endpoint details
- [DEPLOYMENT.md](09_DEPLOYMENT.md) - API deployment info

---

**Next: Read [09_DEPLOYMENT.md](09_DEPLOYMENT.md) untuk understand production setup**
