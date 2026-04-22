from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from routers import price_checker, order_loss, failed_delivery, presales, erp_oos, sku_plan, conversion_cleaner, order_match, auth, warehouse_order, socmed, affiliate, tiktok_ads
from database import engine, Base
import models  # noqa: F401 - ensure all models are registered before create_all
import os

# AI Chat router is optional (only loaded if GEMINI_API_KEY is configured)
ai_chat_available = False
if os.getenv("GEMINI_API_KEY"):
    try:
        from routers import ai_chat
        ai_chat_available = True
    except Exception as e:
        print(f"[Startup] ⚠ AI Chat not available: {e}")
else:
    print("[Startup] ℹ GEMINI_API_KEY not configured. AI Chat endpoint will not be available.")

app = FastAPI()

# Auto-create any missing tables on startup (safe: does not drop existing tables)
# Wrapped in try-except to allow server to start even if DB is temporarily unavailable
try:
    Base.metadata.create_all(bind=engine)
    print("[Startup] ✓ Database tables created/verified.")
except Exception as e:
    print(f"[Startup] ⚠ Database not yet available: {e}")

# --- Inline migration: add missing columns to existing tables ---
# create_all() does NOT alter existing tables, so we must add new columns manually.
def _run_migrations():
    migrations = [
        # Add 'permissions' JSON column to account_users (added for permission-based access control)
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'account_users' AND column_name = 'permissions'
            ) THEN
                ALTER TABLE account_users ADD COLUMN permissions JSON;
            END IF;
        END
        $$;
        """,
    ]
    with engine.connect() as conn:
        for sql in migrations:
            conn.execute(text(sql))
        conn.commit()
    print("[Startup] ✓ Database migrations checked / applied.")

try:
    _run_migrations()
except Exception as e:
    print(f"[Startup] ⚠ Migration warning: {e}")

# Frontend uses Bearer token in Authorization header (not cookies),
# so allow_credentials=False is correct and safer.
_cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(price_checker.router)
app.include_router(order_loss.router)
app.include_router(failed_delivery.router)
app.include_router(presales.router)
app.include_router(erp_oos.router)
app.include_router(sku_plan.router)
app.include_router(conversion_cleaner.router)
app.include_router(order_match.router)
app.include_router(auth.router)
app.include_router(warehouse_order.router)
app.include_router(socmed.router)
app.include_router(affiliate.router)
app.include_router(tiktok_ads.router)

# Include AI Chat router only if GEMINI_API_KEY is set
if ai_chat_available:
    app.include_router(ai_chat.router)
    print("[Startup] ✓ AI Chat endpoint registered.")

from routers import shopee_affiliate
app.include_router(shopee_affiliate.router, prefix="/api/shopee-affiliate", tags=["shopee-affiliate"])

@app.get("/")
def read_root():
    return {"message": "Welcome to FastAPI Backend!"}

@app.get("/api/health")
def health_check():
    """Lightweight wake-up endpoint — keeps Render from returning a cold start during login."""
    return {"status": "ok"}
