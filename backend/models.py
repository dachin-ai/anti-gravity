from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from database import Base

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    time = Column(DateTime)
    username = Column(String, index=True)
    tools = Column(String)

from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import JSON

class FreemirPrice(Base):
    __tablename__ = "freemir_price"
    
    sku = Column(String, primary_key=True, index=True)
    category = Column(String)
    clearance = Column(String)
    # Flexible JSON storage for Warning, Daily-Discount, etc...
    # Using JSON instead of JSONB for broad compatibility across SQLites/Postgres if needed
    # But since we're on Neon Postgres, JSONB is ideal. We'll use the generic JSON.
    prices = Column(JSON)

class FreemirName(Base):
    __tablename__ = "freemir_name"
    
    sku = Column(String, primary_key=True, index=True)
    product_name = Column(String)
    link = Column(String)
