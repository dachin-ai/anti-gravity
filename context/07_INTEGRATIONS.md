# 7. EXTERNAL INTEGRATIONS

## 📡 Overview

Sistem terintegrasi dengan beberapa layanan eksternal untuk data sync, notifikasi, dan analytics.

---

## 📋 1. Google Sheets API (User Sync)

### Purpose
Sync user list dari Google Sheets → Database (every 5 min)

### Setup

**Service Account JSON:**
- Location: Google Cloud Console
- File: `credentials.json` (in Cloud Storage, not in git!)
- Permissions: Read/Write access to specific sheet

**In Code:**
```python
# File: services/auth_logic.py

import gspread
from google.oauth2.service_account import Credentials

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

credentials = Credentials.from_service_account_file(
    'path/to/credentials.json',
    scopes=SCOPES
)

client = gspread.authorize(credentials)

def get_users_from_sheets():
    sh = client.open("user_list")  # Google Sheets name
    ws = sh.worksheet(0)  # First worksheet
    users = ws.get_all_records()
    return users
```

### Performance
- **With 5-min cache:** ~5ms (return cached)
- **Without cache:** ~1-2 sec (API call)
- **DB update:** ~200ms (incremental)

### Troubleshooting
| Issue | Cause | Solution |
|-------|-------|----------|
| "Worksheet not found" | Wrong sheet name | Check exact sheet name in Google Sheets |
| Slow sync | No caching | Cache reduces calls by 300x |
| "Permission denied" | Service account limited | Add sheet to service account access |

---

## 🔔 2. DingTalk Webhook (Notifications)

### Purpose
Send real-time notifications ke DingTalk group untuk alerts

### Setup

**Webhook URL:**
```
https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN
```

**In Code:**
```python
# File: services/dingtalk_logic.py

import requests

DINGTALK_WEBHOOK = os.getenv("DINGTALK_WEBHOOK_URL")

def send_dingtalk_message(title: str, message: str, severity="info"):
    """
    severity: 'info', 'warning', 'error'
    """
    
    color_map = {
        "info": "#0066FF",
        "warning": "#FFAA00",
        "error": "#FF0000"
    }
    
    payload = {
        "msgtype": "markdown",
        "markdown": {
            "title": title,
            "text": f"### {title}\n\n{message}"
        },
        "at": {
            "isAtAll": False
        }
    }
    
    response = requests.post(DINGTALK_WEBHOOK, json=payload)
    return response.status_code == 200

# Usage:
send_dingtalk_message(
    title="Order Audit Complete",
    message="51 orders flagged for review",
    severity="warning"
)
```

### Example Notification
```
Title: Order Audit Complete
Message: 51 orders flagged for review
Color: Orange (warning)
```

### Troubleshooting
| Issue | Cause | Solution |
|-------|-------|----------|
| No message received | Wrong webhook URL | Verify token in DingTalk group settings |
| "Invalid token" | Token expired | Refresh token in DingTalk admin panel |
| Rate limit exceeded | Too many messages | Add throttling (max 1 = msg per sec) |

---

## 🎯 3. TikTok Ads API (Future)

### Purpose
Fetch ad performance data untuk correlation dengan order data

### Planned Implementation

```python
# File: services/tiktok_logic.py

from tiktok_ads_sdk import TikTokAds

CLIENT_ID = os.getenv("TIKTOK_CLIENT_ID")
SECRET_KEY = os.getenv("TIKTOK_SECRET_KEY")
ACCESS_TOKEN = os.getenv("TIKTOK_ACCESS_TOKEN")

client = TikTokAds(CLIENT_ID, SECRET_KEY, ACCESS_TOKEN)

def get_ad_performance(campaign_id: str, date_range: tuple):
    """
    Fetch ad metrics untuk specific campaign
    Return: impressions, clicks, conversions, spend
    """
    
    metrics = client.get_campaign_metrics(
        campaign_id=campaign_id,
        start_date=date_range[0],
        end_date=date_range[1]
    )
    
    return {
        "campaign_id": campaign_id,
        "impressions": metrics.get("impressions"),
        "clicks": metrics.get("clicks"),
        "conversions": metrics.get("conversions"),
        "spend": metrics.get("spend")
    }

# Usage:
ad_data = get_ad_performance("12345", ("2026-04-01", "2026-04-30"))
```

### NOTE
Currently NOT implemented - for future phase

---

## 🛍️ 4. Shopee Integration (Webhook)

### Purpose
Receive order notifications dari Shopee

### Setup

**Webhook Endpoint:**
```
POST /api/webhook/shopee
```

**Shopee Webhook Format:**
```json
{
  "action_type": "order_paid",
  "order_id": "123456789",
  "timestamp": 1713270600,
  "shop_id": "12345",
  "order_data": {
    "original_price": 100000,
    "actual_amount_paid": 90000,
    "items": [
      {
        "item_id": "87654321",
        "item_name": "Product A",
        "quantity": 1,
        "price": 100000
      }
    ]
  }
}
```

### In Code
```python
# File: routers/webhook.py

from fastapi import APIRouter, Request

router = APIRouter()

@router.post("/webhook/shopee")
async def handle_shopee_webhook(request: Request):
    """
    Receive order notification dari Shopee
    Process dan store dalam database
    """
    
    payload = await request.json()
    
    # Validate signature (Shopee security)
    if not verify_shopee_signature(payload):
        return {"error": "Invalid signature"}
    
    # Process based on action type
    if payload["action_type"] == "order_paid":
        save_order(payload["order_data"])
        send_dingtalk_message(
            title="New Shopee Order",
            message=f"Order #{payload['order_id']} received"
        )
    
    return {"status": "received"}

def verify_shopee_signature(payload: dict) -> bool:
    """Verify payload came from Shopee"""
    signature = payload.get("signature")
    # Verify using Shopee secret key
    return True  # Simplified
```

### Troubleshooting
| Issue | Cause | Solution |
|-------|-------|----------|
| Webhook not triggered | Not registered in Shopee | Add webhook URL in Shopee Partner Center |
| "Invalid signature" | Wrong secret key | Verify Shopee app secret |
| Duplicate orders | Webhook called twice | Add idempotency check |

---

## 🔄 Integration Architecture

```
┌──────────────────────────────────────┐
│  External Services                   │
├──────────┬─────────────┬─────────────┤
│          │             │             │
▼          ▼             ▼             ▼
Google    DingTalk      TikTok       Shopee
Sheets    Webhook       Ads API      Webhook
  │        │             │             │
  │        │             │             │
  └────┬───┴─────────────┴─────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  FastAPI Backend                     │
│  ┌────────────────────────────────┐  │
│  │ Integration Layer              │  │
│  ├────────┬────────┬────────┬──────┤  │
│  │ auth   │dingtalk│tiktok  │shopee│  │
│  │ sync   │notify  │fetch   │order │  │
│  └────────┴────────┴────────┴──────┘  │
│           │                            │
└───────────┼────────────────────────────┘
            │
            ▼
       PostgreSQL DB
```

---

## 🔑 API Keys & Credentials

**NEVER commit to git!**

```bash
# Store in Cloud Secret Manager or .env

GOOGLE_SHEETS_CREDENTIALS='{...json...}'
DINGTALK_WEBHOOK_URL="https://oapi.dingtalk.com/robot/send?access_token=..."
TIKTOK_CLIENT_ID="..."
TIKTOK_SECRET_KEY="..."
TIKTOK_ACCESS_TOKEN="..."
SHOPEE_PARTNER_ID="..."
SHOPEE_PARTNER_KEY="..."
```

---

## 📈 Performance Monitoring

### Check Integration Health

```bash
# Google Sheets
curl -X GET http://localhost:8000/api/health/google-sheets

# DingTalk
curl -X GET http://localhost:8000/api/health/dingtalk

# Shopee Webhook
curl -X GET http://localhost:8000/api/health/shopee-webhook
```

---

## 🔄 Sync Schedules

### Automatic Syncs

```
Every 5 minutes:
  → Google Sheets user sync

Every 10 minutes:
  → Cache refresh check

Every hour:
  → Price database update

Every day at 00:00:
  → Data backup
  → Cleanup old reports
```

### Manual Triggers

```bash
# Sync users now
POST /api/auth/sync-users

# Fetch latest prices
POST /api/prices/refresh

# Send test notification
POST /api/dingtalk/test
```

---

## ⚠️ Error Handling & Fallbacks

### Google Sheets Failure
```
Primary: API call
Fallback: Use 5-min old cache
Result: Users available (might be stale)
```

### DingTalk Failure
```
Primary: Send message
Fallback: Log in database
Result: Message logged for retry
```

### Shopee Webhook Failure
```
Primary: Process webhook
Fallback: Retry with exponential backoff
Result: Eventually processed or flagged
```

---

## 📚 Related Files

- [ARCHITECTURE.md](03_ARCHITECTURE.md) - System architecture
- [DEPLOYMENT.md](09_DEPLOYMENT.md) - Deployment with integrations
- [ENVIRONMENT.md](10_ENVIRONMENT.md) - Credential management

---

**Next: Read [08_BUSINESS_LOGIC.md](08_BUSINESS_LOGIC.md) untuk understand pricing tiers**
