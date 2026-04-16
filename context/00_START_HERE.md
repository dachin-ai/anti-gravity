# Antigravity Project - Complete Knowledge Base

**Last Updated:** April 16, 2026  
**Status:** Production Active  
**Deployment:** Google Cloud Run (asia-southeast1-c)

## 📚 Documentation Index

Dokumentasi ini dirancang untuk **handover AI-to-AI** dan memastikan kontinuitas sistem. Setiap file berisi informasi lengkap tentang satu aspek sistem.

### 1. **OVERVIEW.md** - Mulai dari sini jika baru
   - ✅ System architecture overview
   - ✅ Tech stack & frameworks
   - ✅ Key features & capabilities
   - ✅ Current production status

### 2. **DATABASE.md** - Informasi sistem data
   - 📊 Database schema & relationships
   - 🔐 Connection credentials (sanitized)
   - 🔑 Tables & columns explanation
   - 📈 Performance optimization notes

### 3. **AUTHENTICATION.md** - User login & auth system
   - 🔓 Login flow explanation
   - 📋 User sync from Google Sheets
   - ⏱️ Performance optimization (5-min cache)
   - 🎫 JWT token generation & validation

### 4. **ORDER_LOSS_AUDIT.md** - Order auditing logic (CRITICAL)
   - 📊 Audit algorithm explanation
   - 🔍 First Judge vs Second Judge logic
   - 💰 Profit/loss calculations
   - 📈 Excel output generation
   - 🐛 Known data issues & solutions

### 5. **API_ENDPOINTS.md** - REST API documentation
   - 🔌 All FastAPI endpoint descriptions
   - 📝 Request/response examples
   - 🔐 Authentication requirements
   - ⚡ Rate limiting info

### 6. **INTEGRATIONS.md** - External APIs
   - 📋 Google Sheets API (user sync)
   - 🔔 DingTalk webhooks (notifications)
   - 🎯 TikTok Ads API (data pipeline)
   - 🛒 Shopee integration (order data)

### 7. **BUSINESS_LOGIC.md** - Pricing & rules
   - 💵 16 price tiers explanation
   - 🔢 Bundle discount calculation
   - 🎁 Gift item handling
   - 🏷️ Clearance pricing logic

### 8. **DEPLOYMENT.md** - Cloud & CI/CD
   - 🚀 Cloud Build pipeline
   - 📦 Docker containerization
   - 🌐 Cloud Run service config
   - 📮 Environment variables setup

### 9. **ENVIRONMENT.md** - Config & secrets
   - 🔑 All required environment variables
   - 📝 .env template & examples
   - 🔐 Credential management
   - ⚙️ Feature flags

### 10. **TROUBLESHOOTING.md** - Common issues
    - 🐞 Pandas Series comparison issues
    - 📊 Excel column mapping problems
    - 🔌 Database connection failures
    - ⚡ Performance bottlenecks & fixes

### 11. **CODE_WALKTHROUGH.md** - Detailed code guide
    - 📄 Key file explanations (`auth_logic.py`, `order_loss_logic.py`, etc.)
    - 🔄 Function flow diagrams
    - 💡 Important algorithms
    - ⚠️ Edge cases & mitigation

### 12. **QUICK_REFERENCE.md** - Cheat sheet
    - ⚡ Quick facts & numbers
    - 🔗 Important links & URLs
    - 📞 Contact information
    - 🔍 Critical file locations

---

## 🎯 Quick Start for New AI

**Urutan membaca (10 menit):**
1. **OVERVIEW.md** → Pahami sistem secara keseluruhan
2. **DATABASE.md** → Tahu bagaimana data tersimpan
3. **ARCHITECTURE.md** → Flow data dari user ke database
4. **AUTHENTICATION.md** → Paham login workflow

**Untuk task spesifik:**
- **Fix order audit** → ORDER_LOSS_AUDIT.md + CODE_WALKTHROUGH.md
- **Optimize performa** → TROUBLESHOOTING.md + DATABASE.md
- **Deploy changes** → DEPLOYMENT.md + ENVIRONMENT.md
- **Integrate API baru** → INTEGRATIONS.md
- **Tuning pricing** → BUSINESS_LOGIC.md

---

## 🚀 System Status

**✅ Production Ready**
- Authentication: 20-30 detik (dari 60+ setelah optimisasi)
- Database: 214 SKU cached, 20 connection pool
- Order Audit: Handle 114+ row Excel files
- Users: 21 synced dari Google Sheets

**⚠️ Known Limitations**
- JWT token expiry: 24 jam (production decision)
- Google Sheets cache: 5 menit
- Bundle discount: Max 5 SKU per bundle
- Excel: Max 10,000 rows untuk performa

**📈 Performance Metrics**
- Sign-in: ~20-30 sec (optimized)
- User sync: ~5 sec (incremental)
- Audit process: ~2-3 sec per file
- DB queries: avg 50-100ms

---

## 🔐 Security Notes

⚠️ **IMPORTANT FOR HANDOVER:**
1. Database password: `/context/DATABASE.md` (encrypted reference)
2. Google Sheets API: Service account JSON in Cloud Storage
3. JWT secret: Stored in Cloud Secret Manager
4. VPS credentials: Multi-layer authentication required
5. Never commit `.env` file to git

---

## 📞 Key Contacts & Resources

- **Owner:** Dena Firdaus (denaf)
- **VPS Location:** 34.126.76.58:5432 (PostgreSQL)
- **Cloud Project:** Google Cloud Platform (asia-southeast1-c)
- **Repository:** GitHub - dachin-ai/anti-gravity
- **Monitoring:** Cloud Build + Cloud Run logs

---

## 📝 Version History

| Date | Changes | Status |
|------|---------|--------|
| 2026-04-16 | Documentation created, all systems documented | ✅ Current |
| 2026-04-15 | Order audit fixes, pandas issues resolved | ✅ Deployed |
| 2026-04-14 | Auth optimization (5-min cache + pooling) | ✅ Deployed |
| 2026-04-13 | Database connection fix (localhost → VPS) | ✅ Deployed |

---

## 🎓 Learning Resources

- **FastAPI:** https://fastapi.tiangolo.com
- **SQLAlchemy:** https://www.sqlalchemy.org
- **Pandas:** https://pandas.pydata.org
- **PostgreSQL:** https://www.postgresql.org/docs/

---

**Ready to handover? Start with OVERVIEW.md!**
