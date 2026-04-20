#!/usr/bin/env python3
"""
Database Migration Script for Neon PostgreSQL
This script handles the complete migration to the new Neon database.
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import text, inspect
from database import engine, SessionLocal, Base
import models  # noqa: F401 - Ensure all models are registered

# Load environment variables
load_dotenv()

def check_database_connection():
    """Verify connection to the database."""
    print("[1/5] Checking database connection...")
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            conn.commit()
        print("✓ Database connection successful")
        return True
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return False

def create_all_tables():
    """Create all tables based on models."""
    print("[2/5] Creating tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✓ All tables created/verified")
        return True
    except Exception as e:
        print(f"✗ Failed to create tables: {e}")
        return False

def list_created_tables():
    """List all created tables."""
    print("[3/5] Verifying tables...")
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"✓ Found {len(tables)} tables:")
        for table in sorted(tables):
            print(f"  - {table}")
        return True
    except Exception as e:
        print(f"✗ Failed to inspect tables: {e}")
        return False

def run_migrations():
    """Run any inline migrations (add missing columns, etc)."""
    print("[4/5] Running migrations...")
    
    migrations = [
        # Add 'permissions' JSON column to account_users
        (
            "permissions_column_account_users",
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'account_users' AND column_name = 'permissions'
                ) THEN
                    ALTER TABLE account_users ADD COLUMN permissions JSON;
                END IF;
            END
            $$;
            """
        ),
    ]
    
    try:
        with engine.connect() as conn:
            for migration_name, sql in migrations:
                try:
                    conn.execute(text(sql))
                    print(f"  ✓ Applied: {migration_name}")
                except Exception as e:
                    print(f"  ⚠ Migration '{migration_name}' warning: {e}")
            conn.commit()
        print("✓ All migrations completed")
        return True
    except Exception as e:
        print(f"✗ Failed to run migrations: {e}")
        return False

def verify_schema():
    """Verify the schema has all required columns."""
    print("[5/5] Verifying schema...")
    try:
        inspector = inspect(engine)
        
        # Check account_users has permissions column
        account_users_cols = [col['name'] for col in inspector.get_columns('account_users')]
        if 'permissions' in account_users_cols:
            print("  ✓ account_users has 'permissions' column")
        else:
            print("  ⚠ account_users missing 'permissions' column (will be added on first startup)")
        
        # Check other tables
        expected_tables = [
            'activity_logs', 'account_users', 'freemir_price', 'freemir_name',
            'shopee_aff_conversions', 'shopee_aff_products', 'shopee_aff_creators'
        ]
        existing_tables = inspector.get_table_names()
        for table in expected_tables:
            if table in existing_tables:
                col_count = len(inspector.get_columns(table))
                print(f"  ✓ {table} ({col_count} columns)")
            else:
                print(f"  ✗ {table} missing")
        
        return True
    except Exception as e:
        print(f"✗ Schema verification failed: {e}")
        return False

def main():
    """Run the complete migration."""
    print("=" * 60)
    print("🚀 Neon PostgreSQL Migration Script")
    print("=" * 60)
    print()
    
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("✗ DATABASE_URL environment variable not set!")
        print("  Please set DATABASE_URL to your Neon connection string")
        print()
        print("  Example:")
        print("  DATABASE_URL=postgresql://user:password@host/database")
        sys.exit(1)
    
    # Mask the password in the display
    display_url = db_url.replace(db_url.split(':')[2].split('@')[0], '****')
    print(f"Database: {display_url}")
    print()
    
    steps = [
        check_database_connection,
        create_all_tables,
        list_created_tables,
        run_migrations,
        verify_schema,
    ]
    
    for step in steps:
        if not step():
            print()
            print("✗ Migration failed. Please check the errors above.")
            sys.exit(1)
        print()
    
    print("=" * 60)
    print("✓ Migration completed successfully!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Test the backend locally:")
    print("   python -m uvicorn main:app --reload")
    print()
    print("2. Deploy to Cloud Run:")
    print("   git add . && git commit -m 'chore: migrate to neon database'")
    print("   git push origin main")
    print()
    print("3. Monitor the deployment:")
    print("   https://console.cloud.google.com/cloud-build/builds")
    print()

if __name__ == "__main__":
    main()
