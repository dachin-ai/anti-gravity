from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.sql import func
from database import Base

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    time = Column(DateTime)
    username = Column(String, index=True)
    tools = Column(String)

class AccountUser(Base):
    __tablename__ = "account_users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    approval = Column(String)
    permissions = Column(JSON)

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

# --- Shopee Affiliate Analytics Models ---

from sqlalchemy import Float, Date

class ShopeeAffConversion(Base):
    __tablename__ = "shopee_aff_conversions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(String, index=True)
    store_id = Column(String, index=True)
    order_time = Column(DateTime)
    order_status = Column(String)
    product_id = Column(String, index=True)
    variation_id = Column(String)
    product_name = Column(String)
    affiliate_username = Column(String, index=True)
    affiliate_name = Column(String)
    purchase_value = Column(Float)
    commission = Column(Float)
    channel = Column(String)

class ShopeeAffProduct(Base):
    __tablename__ = "shopee_aff_products"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(Date, index=True)
    store_id = Column(String, index=True)
    product_id = Column(String, index=True)
    product_name = Column(String)
    gmv = Column(Float)
    unit_sold = Column(Integer)
    commission = Column(Float)
    roi = Column(Float)

class ShopeeAffCreator(Base):
    __tablename__ = "shopee_aff_creators"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(Date, index=True)
    store_id = Column(String, index=True)
    affiliate_username = Column(String, index=True)
    affiliate_name = Column(String)
    gmv = Column(Float)
    unit_sold = Column(Integer)
    clicks = Column(Integer)
    commission = Column(Float)
    roi = Column(Float)

