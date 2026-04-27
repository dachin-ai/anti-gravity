#!/usr/bin/env python3
"""
Test Batch Processing Fix for Production
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')

import pandas as pd
import requests
import json
from io import BytesIO
import os

def create_test_excel():
    """Create a simple test Excel file for batch processing"""
    # Test SKU method
    sku_data = {
        'SKU': ['SKU001', 'SKU002', 'SKU003', 'INVALID_SKU'],
        'Input Price': [15000, 25000, 35000, 10000]
    }
    df_sku = pd.DataFrame(sku_data)
    
    # Create Excel file in memory
    excel_buffer = BytesIO()
    with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
        df_sku.to_excel(writer, sheet_name='Sheet1', index=False)
    
    excel_buffer.seek(0)
    return excel_buffer.getvalue()

def test_batch_processing():
    """Test batch processing with local server"""
    print("=== BATCH PROCESSING TEST ===")
    
    # Create test file
    test_file_content = create_test_excel()
    print(f"[INFO] Created test Excel file: {len(test_file_content)} bytes")
    
    # Test local server
    backend_url = "http://localhost:8001"
    
    try:
        # Test health check first
        health_response = requests.get(f"{backend_url}/api/health", timeout=5)
        if health_response.status_code == 200:
            print("[SUCCESS] Backend server is running")
        else:
            print("[ERROR] Backend server not responding")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Cannot connect to backend: {e}")
        print("[INFO] Please start backend server first: python main.py")
        return False
    
    # Test batch processing
    try:
        print("\n[TEST] Testing batch SKU processing...")
        
        files = {'file': ('test_sku.xlsx', test_file_content, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        data = {'method': 'SKU'}
        
        response = requests.post(
            f"{backend_url}/api/price-checker/calculate-batch",
            files=files,
            data=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"[SUCCESS] Batch processing completed!")
            print(f"   Total rows: {result['summary']['total']}")
            print(f"   Processed rows: {result['summary'].get('processed', 'N/A')}")
            print(f"   Valid rows: {result['summary']['valid']}")
            print(f"   Invalid rows: {result['summary']['invalid']}")
            print(f"   Failed rows: {result['summary'].get('failed', 'N/A')}")
            
            if 'processing_info' in result:
                info = result['processing_info']
                print(f"   File size: {info.get('file_size_mb', 'N/A')} MB")
                print(f"   Method: {info.get('method', 'N/A')}")
                print(f"   Has photo data: {info.get('has_photo_data', 'N/A')}")
                if info.get('failed_row_indices'):
                    print(f"   Failed row indices: {info['failed_row_indices']}")
            
            # Check preview data
            if result.get('preview') and len(result['preview']) > 0:
                print(f"   Preview rows: {len(result['preview'])}")
                first_row = result['preview'][0]
                if 'SKU' in first_row:
                    print(f"   First SKU: {first_row['SKU']}")
            
            return True
            
        else:
            print(f"[ERROR] Batch processing failed with status {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("[ERROR] Request timeout - batch processing took too long")
        return False
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")
        return False

def test_import_fix():
    """Test that the import fix works"""
    print("\n=== IMPORT FIX TEST ===")
    
    try:
        from services.product_performance_logic import get_sku_photo_map
        print("[SUCCESS] get_sku_photo_map import works")
        
        # Test with empty SKU set
        from database import SessionLocal
        db = SessionLocal()
        try:
            result = get_sku_photo_map(db, set())
            print(f"[SUCCESS] get_sku_photo_map function works: {len(result)} results")
        finally:
            db.close()
            
        return True
        
    except ImportError as e:
        print(f"[ERROR] Import still broken: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] Function test failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing Batch Processing Fixes for Production")
    print("=" * 50)
    
    # Test import fix
    import_ok = test_import_fix()
    
    # Test batch processing
    batch_ok = test_batch_processing()
    
    print("\n" + "=" * 50)
    print("TEST SUMMARY:")
    print(f"  Import Fix: {'✅ PASS' if import_ok else '❌ FAIL'}")
    print(f"  Batch Processing: {'✅ PASS' if batch_ok else '❌ FAIL'}")
    
    if import_ok and batch_ok:
        print("\n🎉 All tests passed! Ready for production deployment.")
    else:
        print("\n⚠️ Some tests failed. Check the errors above.")
    
    print("=" * 50)
