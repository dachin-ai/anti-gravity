from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import time

DB = 'postgresql://neondb_owner:npg_e1Jl3rWoTcAR@ep-withered-butterfly-ao66aczs-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
engine = create_engine(DB)
db = sessionmaker(bind=engine)()

t = time.time()
db.execute(text("SELECT 1"))
db.commit()
print(f"ping: {time.time()-t:.2f}s")

t = time.time()
sql = text("INSERT INTO freemir_name (sku,product_name,link) VALUES (:s,:n,:l) ON CONFLICT (sku) DO UPDATE SET product_name=EXCLUDED.product_name,link=EXCLUDED.link")
for i in range(5):
    db.execute(sql, {"s": f"T{i}", "n": f"Name{i}", "l": "http://x.jpg"})
db.commit()
print(f"5 inserts: {time.time()-t:.2f}s")
db.close()
print("Done")
