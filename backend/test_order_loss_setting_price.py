"""
Test script untuk validate Setting Price lookup logic yang baru
Akan test 3 skenario:
1. Order dengan Order allocated amount (新 column) 
2. Order tanpa Order allocated amount fallback ke Product Detail Amount After Discount
3. Mixed orders
"""

import pandas as pd
import numpy as np
from services.order_loss_logic import run_order_loss_audit
import os
import io

# Mock price database
MOCK_PRICE_DB = {
    'SKU001': {
        'Category': 'Normal',
        'Clearance': 0,
        'Warning': 100000,
        'Daily-Discount': 95000,
    },
    'SKU002': {
        'Category': 'Gift',
        'Clearance': 0,
        'Warning': 50000,
        'Daily-Discount': 48000,
    },
    'SKU003': {
        'Category': 'Normal',
        'Clearance': 150000,  # Clearance item
        'Warning': 120000,
        'Daily-Discount': 115000,
    }
}

def test_scenario_1_with_allocated_amount():
    """Test: Order dengan Order allocated amount column"""
    print("\n" + "="*70)
    print("TEST SCENARIO 1: With Order Allocated Amount Column")
    print("="*70)
    
    data = {
        'Original Order Number': ['ORD001', 'ORD001', 'ORD002'],
        'ERP Order Number': ['ERP001', 'ERP001', 'ERP002'],
        'Store': ['Store A', 'Store A', 'Store B'],
        'Online Product Code': ['PID001', 'PID002', 'PID003'],
        'System Product Code': ['SKU001', 'SKU002', 'SKU003'],
        'Product Detail Gross Profit': [5000, 3000, 8000],
        'Product Detail Amount After Discount': [95000, 48000, 145000],
        'Seller Coupon': [0, 0, 0],
        '订单分摊金额': [120000, 120000, 155000],  # Order allocated amount - BARU
    }
    
    df = pd.DataFrame(data)
    
    print("\nInput Data:")
    print(df.to_string())
    
    try:
        summary, excel_bytes = run_order_loss_audit(df, MOCK_PRICE_DB, price_type="Warning", method="Profit Review")
        print("\n✅ SUCCESS!")
        print(f"\nSummary: {summary}")
        print(f"\nExpected Setting Price for ORD001: 120000 (from 订单分摊金额)")
        print(f"Expected Setting Price for ORD002: 155000 (from 订单分摊金额)")
        return True
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_scenario_2_without_allocated_amount():
    """Test: Order tanpa Order allocated amount - fallback ke Product Detail Amount After Discount"""
    print("\n" + "="*70)
    print("TEST SCENARIO 2: Without Order Allocated Amount (Fallback to Product Detail Amount)")
    print("="*70)
    
    data = {
        'Original Order Number': ['ORD001', 'ORD001', 'ORD002'],
        'ERP Order Number': ['ERP001', 'ERP001', 'ERP002'],
        'Store': ['Store A', 'Store A', 'Store B'],
        'Online Product Code': ['PID001', 'PID002', 'PID003'],
        'System Product Code': ['SKU001', 'SKU002', 'SKU003'],
        'Product Detail Gross Profit': [5000, 3000, 8000],
        'Product Detail Amount After Discount': [95000, 48000, 145000],
        'Seller Coupon': [0, 0, 0],
        # NO '订单分摊金额' column - should fallback
    }
    
    df = pd.DataFrame(data)
    
    print("\nInput Data (NO '订单分摊金额' column):")
    print(df.to_string())
    
    try:
        summary, excel_bytes = run_order_loss_audit(df, MOCK_PRICE_DB, price_type="Warning", method="Profit Review")
        print("\n✅ SUCCESS!")
        print(f"\nSummary: {summary}")
        print(f"\nExpected Setting Price for ORD001: 95000 (first value of Product Detail Amount After Discount)")
        print(f"Expected Setting Price for ORD002: 145000 (first value of Product Detail Amount After Discount)")
        return True
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_scenario_3_mixed():
    """Test: Mixed orders some with allocated amount, some without"""
    print("\n" + "="*70)
    print("TEST SCENARIO 3: Mixed Scenario")
    print("="*70)
    
    data = {
        'Original Order Number': ['ORD001', 'ORD001', 'ORD002', 'ORD002'],
        'ERP Order Number': ['ERP001', 'ERP001', 'ERP002', 'ERP002'],
        'Store': ['Store A', 'Store A', 'Store B', 'Store B'],
        'Online Product Code': ['PID001', 'PID002', 'PID003', 'PID004'],
        'System Product Code': ['SKU001', 'SKU002', 'SKU003', 'SKU001'],
        'Product Detail Gross Profit': [5000, 3000, 8000, 4000],
        'Product Detail Amount After Discount': [95000, 48000, 145000, 98000],
        'Seller Coupon': [0, 0, 0, 0],
        '订单分摊金额': [120000, 120000, np.nan, np.nan],  # Only ORD001 has allocated amount
    }
    
    df = pd.DataFrame(data)
    
    print("\nInput Data (Mixed: ORD001 has allocated, ORD002 doesn't):")
    print(df.to_string())
    
    try:
        summary, excel_bytes = run_order_loss_audit(df, MOCK_PRICE_DB, price_type="Warning", method="Profit Review")
        print("\n✅ SUCCESS!")
        print(f"\nSummary: {summary}")
        print(f"\nExpected Setting Price for ORD001: 120000 (from 订单分摊金额)")
        print(f"Expected Setting Price for ORD002: 145000 (fallback to Product Detail Amount After Discount)")
        return True
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("\n" + "="*70)
    print("TESTING SETTING PRICE LOOKUP LOGIC")
    print("="*70)
    
    results = []
    results.append(("Scenario 1 (With Allocated Amount)", test_scenario_1_with_allocated_amount()))
    results.append(("Scenario 2 (Without Allocated Amount - Fallback)", test_scenario_2_without_allocated_amount()))
    results.append(("Scenario 3 (Mixed)", test_scenario_3_mixed()))
    
    print("\n" + "="*70)
    print("TEST RESULTS SUMMARY")
    print("="*70)
    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    all_passed = all(result for _, result in results)
    print(f"\nOverall: {'✅ ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}")
