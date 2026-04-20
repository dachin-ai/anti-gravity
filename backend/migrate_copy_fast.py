#!/usr/bin/env python3
"""
Ultra-Fast Migration using PostgreSQL COPY
This uses native database-level data transfer (fastest possible)
"""

import io
from sqlalchemy import create_engine, inspect, text
import csv

OLD_DB = "postgresql://neondb_owner:npg_8gALsPeSvFN1@ep-noisy-paper-a1b3rtgl-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
NEW_DB = "postgresql://neondb_owner:npg_e1Jl3rWoTcAR@ep-withered-butterfly-ao66aczs-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

print("=" * 70)
print("🚀 ULTRA-FAST NEON → NEON MIGRATION (COPY-based)")
print("=" * 70)
print()

old_engine = create_engine(OLD_DB, echo=False)
new_engine = create_engine(NEW_DB, echo=False)

# Step 1: Get tables
print("[1/3] Identifying tables...")
inspector = inspect(old_engine)
tables = sorted(inspector.get_table_names())
print(f"✓ Found {len(tables)} tables")
print()

print("[2/3] Copying data...")
total_rows = 0

for table_name in tables:
    print(f"  📦 {table_name}...", end=" ", flush=True)
    
    try:
        with old_engine.connect() as old_conn:
            # Get column names
            columns = [col['name'] for col in inspect(old_engine).get_columns(table_name)]
            
            # Export data as CSV (fast!)
            result = old_conn.execute(text(f"SELECT * FROM {table_name}"))
            rows = result.fetchall()
        
        if not rows:
            print("(empty)")
            continue
        
        # Convert to CSV format
        csv_buffer = io.StringIO()
        writer = csv.writer(csv_buffer, quoting=csv.QUOTE_MINIMAL)
        
        for row in rows:
            # Convert None to \N (PostgreSQL NULL marker for COPY)
            csv_row = [
                '\\N' if val is None else str(val)
                for val in row
            ]
            writer.writerow(csv_row)
        
        csv_data = csv_buffer.getvalue()
        
        # Import using COPY (database-level, ultra-fast!)
        with new_engine.connect() as new_conn:
            with new_conn.connection.cursor() as cursor:
                col_list = ", ".join([f'"{col}"' for col in columns])
                
                # Use COPY FROM STDIN
                copy_sql = f"COPY {table_name} ({col_list}) FROM STDIN WITH (FORMAT csv, NULL '\\N')"
                cursor.copy_expert(copy_sql, io.StringIO(csv_data))
                new_conn.connection.commit()
        
        print(f"({len(rows)} rows)")
        total_rows += len(rows)
        
    except Exception as e:
        print(f"\n  ✗ Error: {str(e)[:80]}")
        continue

print()
print("[3/3] Verification...")

try:
    with new_engine.connect() as conn:
        for table in tables:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = result.scalar()
            print(f"  ✓ {table}: {count} rows")
except Exception as e:
    print(f"  ⚠ Verification warning: {e}")

print()
print("=" * 70)
print("✓ MIGRATION COMPLETE!")
print("=" * 70)
print(f"Total rows transferred: {total_rows:,}")
print()
print("Next: Deploy to Cloud Run!")
print()
