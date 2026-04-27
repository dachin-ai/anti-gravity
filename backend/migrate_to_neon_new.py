#!/usr/bin/env python3
"""
Migration Script: VPS PostgreSQL → Neon New Database
Priority: Affiliate Data (shopee_aff_* tables) + Critical Tables
"""

import pandas as pd
import sqlalchemy as sa
from sqlalchemy import create_engine, text
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Database URLs
VPS_DB_URL = "postgresql://dena_admin:AntiGrav2026Secure@35.198.222.19:5432/antigravity_db"
NEON_DB_URL = "postgresql://neondb_owner:npg_e1Jl3rWoTcAR@ep-withered-butterfly-ao66aczs-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

def create_engines():
    """Create database engines for both source and target"""
    vps_engine = create_engine(VPS_DB_URL, pool_pre_ping=True)
    neon_engine = create_engine(NEON_DB_URL, pool_pre_ping=True)
    return vps_engine, neon_engine

def check_table_existence(engine, table_name):
    """Check if table exists in database"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = '{table_name}'
                );
            """))
            return result.scalar()
    except Exception as e:
        print(f"Error checking table {table_name}: {e}")
        return False

def get_table_row_count(engine, table_name):
    """Get row count for a table"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            return result.scalar()
    except Exception as e:
        print(f"Error getting row count for {table_name}: {e}")
        return 0

def backup_affiliate_data(vps_engine):
    """Backup all affiliate data from VPS"""
    affiliate_tables = [
        'shopee_aff_conversions',
        'shopee_aff_products', 
        'shopee_aff_creators'
    ]
    
    backup_data = {}
    
    for table in affiliate_tables:
        print(f"[BACKUP] Backing up {table}...")
        
        if not check_table_existence(vps_engine, table):
            print(f"[WARNING] Table {table} not found in VPS")
            continue
            
        row_count = get_table_row_count(vps_engine, table)
        print(f"   Found {row_count} rows")
        
        if row_count == 0:
            continue
            
        try:
            df = pd.read_sql_table(table, vps_engine)
            backup_data[table] = df
            print(f"   [SUCCESS] Backed up {len(df)} rows")
            
            # Save to CSV as backup
            backup_filename = f"backup_{table}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            df.to_csv(backup_filename, index=False)
            print(f"   [SAVED] Saved backup to {backup_filename}")
            
        except Exception as e:
            print(f"   [ERROR] Error backing up {table}: {e}")
    
    return backup_data

def migrate_critical_tables(vps_engine, neon_engine):
    """Migrate critical tables: prices, names, users, affiliate data"""
    
    # Critical tables in priority order
    critical_tables = [
        ('freemir_price', 'Price data'),
        ('freemir_name', 'Product names'),
        ('account_users', 'User accounts'),
        ('shopee_aff_conversions', 'Affiliate conversions'),
        ('shopee_aff_products', 'Affiliate products'),
        ('shopee_aff_creators', 'Affiliate creators'),
        ('activity_logs', 'Activity logs'),
        ('product_performance', 'Product performance'),
        ('pid_store_map', 'PID-Store mapping'),
        ('access_requests', 'Access requests')
    ]
    
    migration_results = {}
    
    for table_name, description in critical_tables:
        print(f"\n[MIGRATE] Migrating {table_name} ({description})...")
        
        # Check if table exists in VPS
        if not check_table_existence(vps_engine, table_name):
            print(f"   [WARNING] Table {table_name} not found in VPS")
            migration_results[table_name] = {"status": "not_found", "rows": 0}
            continue
        
        # Get row count
        vps_count = get_table_row_count(vps_engine, table_name)
        print(f"   VPS rows: {vps_count}")
        
        if vps_count == 0:
            migration_results[table_name] = {"status": "empty", "rows": 0}
            continue
        
        try:
            # Read data from VPS
            df = pd.read_sql_table(table_name, vps_engine)
            print(f"   [READ] Read {len(df)} rows from VPS")
            
            # Write to Neon
            df.to_sql(table_name, neon_engine, if_exists='replace', index=False)
            print(f"   [SUCCESS] Wrote {len(df)} rows to Neon")
            
            # Verify
            neon_count = get_table_row_count(neon_engine, table_name)
            print(f"   [VERIFY] Neon rows: {neon_count}")
            
            migration_results[table_name] = {
                "status": "success", 
                "vps_rows": vps_count,
                "neon_rows": neon_count,
                "matched": vps_count == neon_count
            }
            
        except Exception as e:
            error_msg = str(e).encode('ascii', 'ignore').decode('ascii')
            print(f"   [ERROR] Error migrating {table_name}: {error_msg}")
            migration_results[table_name] = {"status": "error", "error": error_msg, "rows": 0}
    
    return migration_results

def verify_data_integrity(neon_engine):
    """Verify migrated data integrity"""
    print("\n[VERIFY] Verifying data integrity...")
    
    # Check critical tables exist
    critical_tables = [
        'freemir_price', 'freemir_name', 'account_users',
        'shopee_aff_conversions', 'shopee_aff_products', 'shopee_aff_creators'
    ]
    
    integrity_results = {}
    
    for table in critical_tables:
        exists = check_table_existence(neon_engine, table)
        row_count = get_table_row_count(neon_engine, table) if exists else 0
        
        integrity_results[table] = {
            "exists": exists,
            "row_count": row_count
        }
        
        status = "[OK]" if exists and row_count > 0 else "[MISSING]"
        print(f"   {status} {table}: {row_count} rows")
    
    return integrity_results

def main():
    """Main migration function"""
    print("STARTING MIGRATION: VPS -> Neon New Database")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    try:
        # Create engines
        vps_engine, neon_engine = create_engines()
        
        print("[SUCCESS] Database engines created")
        
        # Test connections
        print("\n[CONNECTION] Testing connections...")
        with vps_engine.connect() as conn:
            vps_version = conn.execute(text("SELECT version()")).scalar()
            print(f"   VPS: Connected ({vps_version[:50]}...)")
        
        with neon_engine.connect() as conn:
            neon_version = conn.execute(text("SELECT version()")).scalar()
            print(f"   Neon: Connected ({neon_version[:50]}...)")
        
        # Step 1: Backup affiliate data (priority)
        print("\n" + "=" * 60)
        print("STEP 1: Backup Affiliate Data (Priority)")
        backup_data = backup_affiliate_data(vps_engine)
        
        # Step 2: Migrate all critical tables
        print("\n" + "=" * 60)
        print("STEP 2: Migrate Critical Tables")
        migration_results = migrate_critical_tables(vps_engine, neon_engine)
        
        # Step 3: Verify integrity
        print("\n" + "=" * 60)
        print("STEP 3: Verify Data Integrity")
        integrity_results = verify_data_integrity(neon_engine)
        
        # Summary
        print("\n" + "=" * 60)
        print("MIGRATION SUMMARY")
        print("=" * 60)
        
        success_count = sum(1 for r in migration_results.values() if r.get("status") == "success")
        total_count = len(migration_results)
        
        print(f"[SUCCESS] Successful migrations: {success_count}/{total_count}")
        
        for table, result in migration_results.items():
            status = result.get("status", "unknown")
            if status == "success":
                print(f"   [OK] {table}: {result.get('neon_rows', 0)} rows")
            elif status == "not_found":
                print(f"   [WARN] {table}: Not found in VPS")
            elif status == "empty":
                print(f"   [WARN] {table}: Empty table")
            else:
                print(f"   [ERROR] {table}: {result.get('error', 'Unknown error')}")
        
        print(f"\n[COMPLETE] Migration completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        return migration_results, integrity_results
        
    except Exception as e:
        print(f"\n[FAILED] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return None, None
    
    finally:
        # Close engines
        try:
            vps_engine.dispose()
            neon_engine.dispose()
        except:
            pass

if __name__ == "__main__":
    main()
