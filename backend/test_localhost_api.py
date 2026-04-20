"""
Integration Test - Hit localhost API endpoint untuk test Setting Price logic
Akan upload sample Excel file ke /api/order-loss/calculate endpoint
"""

import requests
import pandas as pd
import io
import json
import base64
from pathlib import Path

# Test data - buat sample Excel file
def create_test_excel():
    """Create test Excel file dengan 2 orders"""
    data = {
        'Original Order Number': ['ORD-001', 'ORD-001', 'ORD-002', 'ORD-002'],
        'ERP Order Number': ['ERP-001', 'ERP-001', 'ERP-002', 'ERP-002'],
        'Store': ['Toko A', 'Toko A', 'Toko B', 'Toko B'],
        'Online Product Code': ['PID001', 'PID002', 'PID003', 'PID004'],
        'System Product Code': ['SKU001', 'SKU002', 'SKU003', 'SKU001'],
        'Product Detail Gross Profit': [5000, 3000, 8000, 4000],
        'Product Detail Amount After Discount': [95000, 48000, 145000, 98000],
        'Seller Coupon': [0, 0, 5000, 0],
        '订单分摊金额': [120000, 120000, 150000, 150000],  # Order allocated amount
    }
    
    df = pd.DataFrame(data)
    
    # Save to Excel
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Orders', index=False)
    output.seek(0)
    return output

def test_order_loss_api():
    """Test Order Loss API endpoint"""
    print("\n" + "="*70)
    print("TESTING: Order Loss API Endpoint (localhost:8000)")
    print("="*70)
    
    api_url = "http://localhost:8000/api/order-loss/calculate"
    
    # Create test Excel
    excel_file = create_test_excel()
    
    # Prepare request
    files = {'file': ('test_orders.xlsx', excel_file, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
    data = {
        'price_type': 'Warning',
        'method': 'Profit Review'
    }
    
    print(f"\n📤 Sending request to: {api_url}")
    print(f"   Price Type: Warning")
    print(f"   Method: Profit Review")
    print(f"   Test Data: 2 orders, 4 items")
    
    try:
        response = requests.post(api_url, files=files, data=data, timeout=30)
        
        print(f"\n✅ Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            
            print("\n" + "-"*70)
            print("SUMMARY RESULTS:")
            print("-"*70)
            
            summary = result.get('summary', {})
            print(f"Total Orders: {summary.get('total_orders', 0)}")
            print(f"Total Transactions: {summary.get('total_transactions', 0)}")
            print(f"Safe Orders: {summary.get('safe_orders', 0)}")
            print(f"Review Orders: {summary.get('review_orders', 0)}")
            print(f"Sales Loss: {summary.get('sales_loss', 0):,}")
            print(f"After Sales Loss: {summary.get('aftersales_loss', 0):,}")
            print(f"Total Profit: {summary.get('total_profit', 0):,}")
            print(f"Final Profit: {summary.get('final_profit', 0):,}")
            
            # Check if Excel file generated
            if 'file_base64' in result:
                print(f"\n✅ Excel file generated successfully ({len(result['file_base64'])} bytes encoded)")
            
            print("\n" + "="*70)
            print("✅ TEST PASSED - API endpoint working correctly!")
            print("="*70)
            return True
            
        else:
            print(f"\n❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"\n❌ ERROR: Tidak bisa connect ke localhost:8000")
        print(f"     Pastikan uvicorn server sudah running!")
        return False
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    try:
        success = test_order_loss_api()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
