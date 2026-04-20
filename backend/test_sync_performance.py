#!/usr/bin/env python3
"""Test sync performance and measure execution time."""

import time
import sys
from services.price_checker_logic import sync_google_sheets_to_neon

if __name__ == "__main__":
    print("="*60)
    print("Testing Google Sheets to Neon Sync Performance")
    print("="*60)
    
    start_time = time.time()
    print(f"\n[{time.strftime('%H:%M:%S')}] Starting sync...")
    
    try:
        count = sync_google_sheets_to_neon()
        elapsed = time.time() - start_time
        
        print(f"\n✓ Sync successful!")
        print(f"  Records synced: {count}")
        print(f"  Time taken: {elapsed:.2f} seconds")
        print(f"  Rate: {count/elapsed:.1f} records/sec")
        
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"\n✗ Sync failed after {elapsed:.2f}s")
        print(f"  Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
