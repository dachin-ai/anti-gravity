from database import SessionLocal
from models import PidStoreMap, ProductPerformance
from sqlalchemy import distinct

db = SessionLocal()

# Get all PIDs from FR02RS004 converter
fr04_pids = set(r.pid for r in db.query(PidStoreMap).filter(PidStoreMap.store == 'FR02RS004').all())
print(f"Unique PIDs in FR02RS004 converter: {len(fr04_pids)}")
print(f"Sample PIDs: {list(fr04_pids)[:5]}")

# Check if any of these PIDs appear in performance data (any store)
matching = db.query(ProductPerformance).filter(ProductPerformance.pid.in_(list(fr04_pids)[:20])).limit(5).all()
print(f"\nPerformance rows matching FR02RS004 PIDs (any store): {len(matching)}")
for r in matching:
    print(f"  pid={r.pid}, store={r.store}, platform={r.platform}, week={r.week}")

# Check how many total performance rows exist
total = db.query(ProductPerformance).count()
print(f"\nTotal performance rows: {total}")

# Check distinct stores in performance
stores_in_perf = db.query(ProductPerformance.store, ProductPerformance.platform).distinct().order_by(ProductPerformance.store).all()
print(f"\nDistinct store+platform in performance ({len(stores_in_perf)} combos):")
for s, p in stores_in_perf[:20]:
    n = db.query(ProductPerformance).filter(ProductPerformance.store == s, ProductPerformance.platform == p).count()
    print(f"  [{p}] {s}: {n} rows")

# Check pid mapping for a sample FR02RS004 PID
sample_pid = list(fr04_pids)[0]
mapped_store = db.query(PidStoreMap).filter(PidStoreMap.pid == sample_pid).all()
print(f"\nPID {sample_pid} appears in converter for stores:")
for m in mapped_store:
    print(f"  store={m.store}, mid={m.mid}")

db.close()
