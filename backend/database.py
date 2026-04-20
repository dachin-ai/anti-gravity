import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Muat variabel environment dari file .env
load_dotenv()

# Ambil URL koneksi
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    print("[FATAL] DATABASE_URL environment variable is not set. Backend cannot start.", file=sys.stderr)
    sys.exit(1)

# Buat engine SQLAlchemy dengan optimized connection pooling
# Pool_pre_ping: test koneksi sebelum dipakai (handles dead connections)
# pool_recycle=300: recycle setiap 5 menit agar tidak melebihi Neon idle timeout
# pool_size=5: cukup untuk Neon pgBouncer pooler mode
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,            # Neon pgBouncer: pakai pool kecil
    max_overflow=5,         # Buffer koneksi tambahan
    pool_recycle=300,       # Recycle setiap 5 menit (Neon idle timeout)
    echo=False              # Set to True untuk debug SQL queries
)

# Buat session local untuk setiap request FastAPI
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class untuk semua Model/Tabel kita
Base = declarative_base()

# Fungsi Dependency untuk di-inject ke rute (router) FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
