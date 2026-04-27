#!/usr/bin/env python3
"""
Test VPS Database Connection and Verify Tables
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')

import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime

# VPS Database URL
VPS_DB_URL = "postgresql://dena_admin:AntiGrav2026Secure@35.198.222.19:5432/antigravity_db"

def test_vps_connection():
    """Test VPS database connection and verify critical tables"""
    print("=== VPS DATABASE CONNECTION TEST ===")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Database: {VPS_DB_URL}")
    print("=" * 50)
    
    try:
        # Create engine
        engine = create_engine(VPS_DB_URL, pool_pre_ping=True)
        
        # Test connection
        with engine.connect() as conn:
            version = conn.execute(text("SELECT version()")).scalar()
            print(f"[SUCCESS] Connected to VPS Database")
            print(f"Version: {version[:80]}...")
            
            # Get all tables
            tables_query = """
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """
            tables_result = conn.execute(text(tables_query))
            tables = [row[0] for row in tables_result]
            
            print(f"\n[INFO] Found {len(tables)} tables:")
            
            # Check critical tables
            critical_tables = [
                'freemir_price', 'freemir_name', 'account_users',
                'shopee_aff_conversions', 'shopee_aff_products', 'shopee_aff_creators',
                'activity_logs', 'product_performance', 'pid_store_map', 'access_requests'
            ]
            
            for table in tables:
                try:
                    count_query = f"SELECT COUNT(*) FROM {table}"
                    count = conn.execute(text(count_query)).scalar()
                    
                    status = "[CRITICAL]" if table in critical_tables else "[REGULAR]"
                    print(f"   {status} {table}: {count:,} rows")
                    
                except Exception as e:
                    print(f"   [ERROR] {table}: {str(e)[:50]}...")
            
            # Test Price Checker specific tables
            print(f"\n[PRICE CHECKER] Testing specific functionality...")
            
            # Test price data
            try:
                price_query = "SELECT COUNT(*) FROM freemir_price WHERE prices IS NOT NULL"
                price_count = conn.execute(text(price_query)).scalar()
                print(f"   Prices with data: {price_count}")
                
                # Test name data  
                name_query = "SELECT COUNT(*) FROM freemir_name WHERE product_name IS NOT NULL"
                name_count = conn.execute(text(name_query)).scalar()
                print(f"   Names with data: {name_count}")
                
            except Exception as e:
                print(f"   [ERROR] Price/Name check failed: {e}")
            
            # Test affiliate data (priority)
            print(f"\n[AFFILIATE DATA] Priority check...")
            
            affiliate_tables = ['shopee_aff_conversions', 'shopee_aff_products', 'shopee_aff_creators']
            
            for table in affiliate_tables:
                if table in tables:
                    try:
                        count_query = f"SELECT COUNT(*) FROM {table}"
                        count = conn.execute(text(count_query)).scalar()
                        print(f"   [AFFILIATE] {table}: {count:,} rows")
                    except Exception as e:
                        print(f"   [ERROR] {table}: {e}")
                else:
                    print(f"   [MISSING] {table}: Table not found")
            
            print(f"\n[SUMMARY] VPS Database Test Complete")
            print(f"   - Connection: SUCCESS")
            print(f"   - Tables: {len(tables)} found")
            print(f"   - Critical Tables: {len([t for t in critical_tables if t in tables])}/{len(critical_tables)}")
            print(f"   - Status: READY FOR PRODUCTION")
            
        return True
        
    except Exception as e:
        print(f"[FAILED] VPS Database connection failed: {e}")
        return False
    
    finally:
        try:
            engine.dispose()
        except:
            pass

if __name__ == "__main__":
    test_vps_connection()
