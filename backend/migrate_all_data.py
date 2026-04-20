#!/usr/bin/env python3
"""
Complete Data Migration Script
Migrates ALL data from old PostgreSQL database to Neon PostgreSQL
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
import json

# Load environment variables
load_dotenv()

# Database URLs
OLD_DATABASE_URL = "postgresql://neondb_owner:npg_8gALsPeSvFN1@ep-noisy-paper-a1b3rtgl-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
NEW_DATABASE_URL = "postgresql://neondb_owner:npg_e1Jl3rWoTcAR@ep-withered-butterfly-ao66aczs-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Create engines
try:
    print("🔗 Connecting to databases...")
    old_engine = create_engine(OLD_DATABASE_URL, echo=False)
    new_engine = create_engine(NEW_DATABASE_URL, echo=False)
    print("✓ Both database connections established")
except Exception as e:
    print(f"✗ Failed to connect to databases: {e}")
    sys.exit(1)

def test_old_connection():
    """Test connection to old database."""
    print("\n[1/7] Testing old database connection...")
    try:
        with old_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            conn.commit()
        print("✓ Old database accessible")
        return True
    except Exception as e:
        print(f"✗ Old database not accessible: {e}")
        print("  (This is OK if you don't have the old Docker database running)")
        return False

def test_new_connection():
    """Test connection to new Neon database."""
    print("\n[2/7] Testing new Neon database connection...")
    try:
        with new_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            conn.commit()
        print("✓ New Neon database accessible")
        return True
    except Exception as e:
        print(f"✗ New database connection failed: {e}")
        return False

def get_all_tables(engine):
    """Get all table names from database."""
    inspector = inspect(engine)
    return inspector.get_table_names()

def get_table_row_count(engine, table_name):
    """Get row count for a table."""
    try:
        with engine.connect() as conn:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            count = result.scalar()
            return count
    except:
        return 0

def migrate_table_data(table_name):
    """Migrate data from old table to new table."""
    print(f"  📦 Migrating {table_name}...", end=" ", flush=True)
    
    try:
        # Get all data from old table
        with old_engine.connect() as old_conn:
            result = old_conn.execute(text(f"SELECT * FROM {table_name}"))
            columns = [col for col in result.keys()]
            rows = result.fetchall()
        
        if not rows:
            print(f"(0 rows)")
            return True, 0
        
        # Insert into new table
        with new_engine.begin() as new_conn:
            for row in rows:
                # Build INSERT statement dynamically
                placeholders = ", ".join([f":{col}" for col in columns])
                insert_sql = f"""
                    INSERT INTO {table_name} ({", ".join(columns)})
                    VALUES ({placeholders})
                """
                
                # Convert row tuple to dict
                row_dict = dict(zip(columns, row))
                
                try:
                    new_conn.execute(text(insert_sql), row_dict)
                except Exception as e:
                    print(f"\n    ⚠ Error inserting row: {e}")
                    # Continue with next row
                    continue
            
            new_conn.commit()
        
        print(f"({len(rows)} rows)")
        return True, len(rows)
        
    except Exception as e:
        print(f"\n    ✗ Migration error: {e}")
        return False, 0

def list_old_tables():
    """List all tables in old database with row counts."""
    print("\n[3/7] Checking old database tables...")
    try:
        old_tables = get_all_tables(old_engine)
        
        if not old_tables:
            print("  (No tables found in old database)")
            return []
        
        print(f"  Found {len(old_tables)} tables:")
        
        table_info = []
        for table in sorted(old_tables):
            count = get_table_row_count(old_engine, table)
            table_info.append((table, count))
            print(f"    - {table}: {count} rows")
        
        return table_info
    except Exception as e:
        print(f"  ⚠ Could not inspect old database: {e}")
        return []

def list_new_tables():
    """List all tables in new Neon database."""
    print("\n[4/7] Checking new Neon database tables...")
    try:
        new_tables = get_all_tables(new_engine)
        
        print(f"  Found {len(new_tables)} tables:")
        for table in sorted(new_tables):
            count = get_table_row_count(new_engine, table)
            print(f"    - {table}: {count} rows")
        
        return new_tables
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return []

def migrate_all_data(old_tables):
    """Migrate all data from old tables to new database."""
    print("\n[5/7] Migrating all data...")
    
    if not old_tables:
        print("  ℹ No data to migrate (old database empty or unreachable)")
        return {}
    
    migration_summary = {}
    
    for table_name, _ in old_tables:
        success, row_count = migrate_table_data(table_name)
        migration_summary[table_name] = {
            'success': success,
            'rows': row_count
        }
    
    return migration_summary

def verify_migration(migration_summary):
    """Verify migrated data."""
    print("\n[6/7] Verifying migration...")
    
    all_ok = True
    for table_name, info in migration_summary.items():
        if info['success']:
            # Check count in new database
            new_count = get_table_row_count(new_engine, table_name)
            expected_count = info['rows']
            
            if new_count == expected_count:
                print(f"  ✓ {table_name}: {new_count} rows verified")
            else:
                print(f"  ⚠ {table_name}: Expected {expected_count} rows, found {new_count}")
                all_ok = False
        else:
            print(f"  ✗ {table_name}: Migration failed")
            all_ok = False
    
    return all_ok

def create_backup():
    """Create JSON backup of old database (optional)."""
    print("\n[7/7] Creating data backup...")
    
    try:
        backup_data = {}
        old_tables = get_all_tables(old_engine)
        
        for table_name in old_tables:
            with old_engine.connect() as conn:
                result = conn.execute(text(f"SELECT * FROM {table_name}"))
                columns = [col for col in result.keys()]
                rows = result.fetchall()
                
                # Convert to list of dicts (JSON serializable)
                table_data = []
                for row in rows:
                    table_data.append(dict(zip(columns, row)))
                
                backup_data[table_name] = table_data
        
        # Save to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"backup_old_db_{timestamp}.json"
        
        with open(backup_file, 'w') as f:
            # Custom JSON encoder for dates, decimals, etc
            json.dump(backup_data, f, default=str, indent=2)
        
        print(f"  ✓ Backup created: {backup_file}")
        return True
        
    except Exception as e:
        print(f"  ⚠ Backup failed (non-critical): {e}")
        return False

def main():
    """Run complete migration."""
    print("=" * 70)
    print("🚀 COMPLETE DATA MIGRATION: Old DB → Neon")
    print("=" * 70)
    print()
    print(f"Old Database: {OLD_DATABASE_URL.split('@')[1] if '@' in OLD_DATABASE_URL else 'localhost'}")
    print(f"New Database: {NEW_DATABASE_URL.split('@')[1] if '@' in NEW_DATABASE_URL else 'neon'}")
    print()
    
    # Step 1: Test connections
    old_ok = test_old_connection()
    new_ok = test_new_connection()
    
    if not new_ok:
        print("\n✗ Cannot proceed without connection to new Neon database")
        sys.exit(1)
    
    if not old_ok:
        print("\n⚠ Old database not accessible. Skipping data migration.")
        print("  (Old Docker database might not be running)")
        print("\n  If you need to migrate data:")
        print("  1. Start old Docker database: docker-compose up -d")
        print("  2. Run this script again")
        print()
        return
    
    # Step 2-3: List tables
    old_table_info = list_old_tables()
    new_tables = list_new_tables()
    
    # Step 4-5: Migrate data
    migration_summary = migrate_all_data(old_table_info)
    
    # Step 6: Verify
    all_ok = verify_migration(migration_summary)
    
    # Step 7: Backup
    create_backup()
    
    # Summary
    print()
    print("=" * 70)
    if all_ok and migration_summary:
        print("✓ MIGRATION COMPLETED SUCCESSFULLY!")
    elif migration_summary:
        print("⚠ MIGRATION COMPLETED WITH WARNINGS")
    else:
        print("ℹ NO DATA TO MIGRATE (Old database empty)")
    print("=" * 70)
    print()
    
    print("Next steps:")
    print("1. Verify all data looks correct in Neon")
    print("2. Test API endpoints")
    print("3. Deploy to Cloud Run:")
    print()
    print("   git add .")
    print("   git commit -m 'chore: complete migration to neon'")
    print("   git push origin main")
    print()

if __name__ == "__main__":
    main()
