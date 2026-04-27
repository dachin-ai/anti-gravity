"""One-time script: create sku_performance table."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from database import engine
from models import Base

Base.metadata.create_all(engine)
print("sku_performance table created (if it didn't exist already).")
