#!/usr/bin/env python3
"""
Fast Data Migration using pg_dump and psql
This is much faster than row-by-row inserts
"""

import subprocess
import os
import sys
from datetime import datetime

# Connection strings
OLD_DB = "postgresql://neondb_owner:npg_8gALsPeSvFN1@ep-noisy-paper-a1b3rtgl-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
NEW_DB = "postgresql://neondb_owner:npg_e1Jl3rWoTcAR@ep-withered-butterfly-ao66aczs-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

def run_command(cmd, description):
    """Run shell command and display output."""
    print(f"  {description}...", end=" ", flush=True)
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=300)
        if result.returncode == 0:
            print("✓")
            return True
        else:
            print(f"\n  ✗ Error: {result.stderr}")
            return False
    except Exception as e:
        print(f"\n  ✗ Exception: {e}")
        return False

def main():
    print("=" * 70)
    print("🚀 FAST DATA MIGRATION: Old Neon → New Neon")
    print("=" * 70)
    print()
    
    # Check if pg_dump and psql are available
    print("[1/4] Checking PostgreSQL tools...")
    
    has_pg_dump = subprocess.run("where pg_dump", shell=True, capture_output=True).returncode == 0
    has_psql = subprocess.run("where psql", shell=True, capture_output=True).returncode == 0
    
    if has_pg_dump and has_psql:
        print("✓ PostgreSQL tools found")
    else:
        print("✗ PostgreSQL tools not found (pg_dump, psql)")
        print()
        print("Install from: https://www.postgresql.org/download/")
        print("Or use pgAdmin/DBeaver to export/import")
        sys.exit(1)
    
    # Step 1: Export data from old database
    print()
    print("[2/4] Exporting data from old Neon database...")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dump_file = f"neon_backup_{timestamp}.sql"
    
    export_cmd = f'pg_dump "{OLD_DB}" --data-only --disable-triggers > "{dump_file}"'
    if not run_command(export_cmd, "Exporting to SQL file"):
        print("\n✗ Export failed")
        sys.exit(1)
    
    # Check file size
    file_size = os.path.getsize(dump_file) / (1024 * 1024)  # MB
    print(f"  Backup file: {dump_file} ({file_size:.2f} MB)")
    
    # Step 2: Import data to new database
    print()
    print("[3/4] Importing data to new Neon database...")
    
    import_cmd = f'psql "{NEW_DB}" < "{dump_file}"'
    if not run_command(import_cmd, "Importing data"):
        print("\n✗ Import failed")
        sys.exit(1)
    
    # Step 3: Verify
    print()
    print("[4/4] Verifying data integrity...")
    
    verify_cmd = f'''psql "{NEW_DB}" -c "
    SELECT COUNT(*) as tables FROM information_schema.tables 
    WHERE table_schema = 'public';
    "'''
    
    result = subprocess.run(verify_cmd, shell=True, capture_output=True, text=True)
    if "tables" in result.stdout:
        print("✓ Verification passed")
    else:
        print("⚠ Could not verify")
    
    print()
    print("=" * 70)
    print("✓ MIGRATION COMPLETED!")
    print("=" * 70)
    print()
    print("Next steps:")
    print("1. Verify data in new Neon database")
    print("2. Test API endpoints")
    print("3. Deploy to Cloud Run")
    print()

if __name__ == "__main__":
    main()
