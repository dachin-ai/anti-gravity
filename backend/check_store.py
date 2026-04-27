from database import SessionLocal
from models import PidStoreMap, ProductPerformance

db = SessionLocal()

count = db.query(PidStoreMap).filter(PidStoreMap.store == 'FR02RS004').count()
print(f"Converter rows for FR02RS004: {count}")
sample = db.query(PidStoreMap).filter(PidStoreMap.store == 'FR02RS004').limit(3).all()
for r in sample:
    print(f"  pid={r.pid}, mid={r.mid}, sku={r.sku}")

pp_count = db.query(ProductPerformance).filter(ProductPerformance.store == 'FR02RS004').count()
print(f"Performance rows for FR02RS004: {pp_count}")

pp_dash = db.query(ProductPerformance).filter(ProductPerformance.store == '-').count()
print(f"Performance rows with store='-': {pp_dash}")

# Check all distinct stores in converter
all_stores = db.query(PidStoreMap.store).distinct().order_by(PidStoreMap.store).all()
print(f"\nAll stores in converter ({len(all_stores)} total):")
for s in all_stores:
    n = db.query(PidStoreMap).filter(PidStoreMap.store == s[0]).count()
    print(f"  {s[0]}: {n} rows")

db.close()
