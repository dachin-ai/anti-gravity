#!/usr/bin/env python3
"""
Migrate data from VPS PostgreSQL → Neon PostgreSQL
VPS  : postgresql://dena_admin:AntiGrav2026Secure@34.126.76.58:5432/antigravity_db
Neon : ep-withered-butterfly-ao66aczs-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb
"""

import sys
from datetime import datetime
from sqlalchemy import create_engine, inspect, text

# ─── Connection strings ────────────────────────────────────────────────────
VPS_URL  = "postgresql://dena_admin:AntiGrav2026Secure@34.126.76.58:5432/antigravity_db"
NEON_URL = "postgresql://neondb_owner:npg_e1Jl3rWoTcAR@ep-withered-butterfly-ao66aczs-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

CHUNK = 500   # rows per batch insert

# ─── Connect ──────────────────────────────────────────────────────────────
print("=" * 70)
print("🚀  VPS PostgreSQL  →  Neon PostgreSQL")
print("=" * 70)

try:
    vps_engine  = create_engine(VPS_URL,  connect_args={"connect_timeout": 10}, echo=False)
    neon_engine = create_engine(NEON_URL, echo=False)
    print("🔗 Engines created")
except Exception as e:
    print(f"✗ Engine creation failed: {e}")
    sys.exit(1)

# ─── Test connections ──────────────────────────────────────────────────────
print("\n[1/4] Testing connections…")
try:
    with vps_engine.connect() as c:
        c.execute(text("SELECT 1"))
    print("  ✓ VPS reachable")
except Exception as e:
    print(f"  ✗ VPS not reachable: {e}")
    sys.exit(1)

try:
    with neon_engine.connect() as c:
        c.execute(text("SELECT 1"))
    print("  ✓ Neon reachable")
except Exception as e:
    print(f"  ✗ Neon not reachable: {e}")
    sys.exit(1)

# ─── Discover tables ──────────────────────────────────────────────────────
print("\n[2/4] Discovering tables…")
vps_tables  = set(inspect(vps_engine).get_table_names())
neon_tables = set(inspect(neon_engine).get_table_names())

print(f"  VPS  tables : {sorted(vps_tables)}")
print(f"  Neon tables : {sorted(neon_tables)}")

common = vps_tables & neon_tables
skip   = vps_tables - neon_tables
print(f"\n  ✓ Will migrate : {sorted(common)}")
if skip:
    print(f"  ⚠ Skipping (not in Neon): {sorted(skip)}")

# ─── Row count check ──────────────────────────────────────────────────────
print("\n[3/4] Row counts before migration…")
def row_count(engine, table):
    try:
        with engine.connect() as c:
            return c.execute(text(f'SELECT COUNT(*) FROM "{table}"')).scalar()
    except:
        return "?"

for t in sorted(common):
    v = row_count(vps_engine, t)
    n = row_count(neon_engine, t)
    print(f"  {t:<35} VPS={v:<8} Neon={n}")

# ─── Migrate ──────────────────────────────────────────────────────────────
print("\n[4/4] Migrating data…")

def get_pk_columns(engine, table):
    """Return list of primary key column names."""
    inspector = inspect(engine)
    pk_info = inspector.get_pk_constraint(table)
    return pk_info.get("constrained_columns", [])

results = {}
for table in sorted(common):
    print(f"\n  📦 {table}")
    try:
        # Fetch all rows from VPS
        with vps_engine.connect() as vc:
            res     = vc.execute(text(f'SELECT * FROM "{table}"'))
            columns = list(res.keys())
            rows    = res.fetchall()

        total   = len(rows)
        if total == 0:
            print(f"     → 0 rows, nothing to do")
            results[table] = (0, 0)
            continue

        # Get PK columns (for ON CONFLICT)
        pk_cols = get_pk_columns(vps_engine, table)

        # Build ON CONFLICT clause
        if pk_cols:
            conflict_clause = f"ON CONFLICT ({', '.join(pk_cols)}) DO NOTHING"
        else:
            conflict_clause = ""   # no PK — just insert

        col_list    = ", ".join(f'"{c}"' for c in columns)
        placeholders = ", ".join(f":{c}" for c in columns)
        sql = text(f'INSERT INTO "{table}" ({col_list}) VALUES ({placeholders}) {conflict_clause}')

        inserted = 0
        skipped  = 0
        for i in range(0, total, CHUNK):
            chunk = rows[i : i + CHUNK]
            with neon_engine.begin() as nc:
                for row in chunk:
                    row_dict = {col: val for col, val in zip(columns, row)}
                    try:
                        r = nc.execute(sql, row_dict)
                        inserted += r.rowcount
                    except Exception as row_err:
                        skipped += 1

            pct = min(100, int((i + len(chunk)) / total * 100))
            print(f"     {pct:3d}%  ({i + len(chunk)}/{total})", end="\r")

        print(f"     ✓  inserted={inserted}  skipped/conflict={total - inserted}    ")
        results[table] = (inserted, total - inserted)

    except Exception as e:
        print(f"     ✗ ERROR: {e}")
        results[table] = ("ERROR", str(e))

# ─── Summary ──────────────────────────────────────────────────────────────
print("\n" + "=" * 70)
print("📊  MIGRATION SUMMARY")
print("=" * 70)
print(f"{'Table':<35} {'Inserted':>10} {'Conflict/Skip':>14}")
print("-" * 70)
for t, (ins, sk) in results.items():
    print(f"  {t:<33} {str(ins):>10} {str(sk):>14}")
print("=" * 70)
print(f"✅  Done at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
