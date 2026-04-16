import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Muat variabel environment dari file .env
load_dotenv()

# Ambil URL koneksi
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Buat engine SQLAlchemy dengan optimized connection pooling
# Pool_pre_ping untuk memastikan koneksi yang mati di-recycle
# Pool_size untuk concurrent connections
# max_overflow untuk buffer connections
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=20,           # Jumlah koneksi yang di-maintain
    max_overflow=10,        # Buffer koneksi tambahan
    pool_recycle=3600,      # Recycle koneksi setiap jam (untuk VPS PostgreSQL)
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
