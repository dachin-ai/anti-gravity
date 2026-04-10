import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Muat variabel environment dari file .env
load_dotenv()

# Ambil URL koneksi
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Buat engine SQLAlchemy
# Pool_pre_ping digunakan untuk memastikan koneksi yang mati di-recycle (sangat berguna untuk cloud DB)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, pool_pre_ping=True
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
