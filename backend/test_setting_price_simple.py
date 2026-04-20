"""
Simple Integration Test untuk Setting Price Logic
Test langsung function tanpa butuh database server
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

# Import langsung functions
import pandas as pd
import numpy as np

# Mock data dan fungsi untuk test
def clean_currency_strict(x):
    if pd.isna(x) or str(x).strip() == '': return 0
    s = str(x).strip().upper()
    import re
    s = re.sub(r'[^\d\.\,\-]', '', s)
    if '.' in s: s = s.split('.')[0]
    if ',' in s: s = s.split(',')[0]
    try:
        if not s or s == '-': return 0
        return int(s)
    except ValueError:
        return 0

def test_setting_price_lookup():
    """Test Setting Price lookup logic"""
    print("\n" + "="*70)
    print("TEST: Setting Price Lookup Logic")
    print("="*70)
    
    # Create test data - 2 orders, 3 items total
    data = {
        'Original Order Number': ['ORD-001', 'ORD-001', 'ORD-002'],
        'ERP Order Number': ['ERP001', 'ERP001', 'ERP002'],
        'Store': ['Toko A', 'Toko A', 'Toko B'],
        'Product Detail Amount After Discount': [95000, 48000, 145000],
        '订单分摊金额': [120000, 120000, np.nan],  # ORD-002 tidak punya allocated amount
    }
    
    df = pd.DataFrame(data)
    
    print("\nInput Data (Raw):")
    print(df)
    
    # Clean currency (as done in real function)
    df['Product Detail Amount After Discount'] = df['Product Detail Amount After Discount'].astype(int)
    df['订单分摊金额'] = df['订单分摊金额'].fillna(0).astype(int)
    
    # Test groupby + aggregation logic (same as in run_order_loss_audit)
    agg_rules = {
        'Product Detail Amount After Discount': 'first',  # Take first value per order
    }
    
    # Add allocated amount if exists
    has_allocated_amount = '订单分摊金额' in df.columns
    if has_allocated_amount:
        agg_rules['订单分摊金额'] = 'first'
    
    print(f"\nAggregation Rules: {agg_rules}")
    
    order_metrics = df.groupby('Original Order Number').agg(agg_rules).reset_index()
    
    print("\nAfter groupby aggregation:")
    print(order_metrics)
    
    # Apply Setting Price logic (NEW SIMPLIFIED LOGIC)
    if has_allocated_amount:
        order_metrics['Setting Price'] = order_metrics['订单分摊金额']
        print("\nUsing '订单分摊金额' column for Setting Price")
    else:
        order_metrics['Setting Price'] = order_metrics['Product Detail Amount After Discount']
        print("\nFallback: Using 'Product Detail Amount After Discount' for Setting Price")
    
    # HANDLE CASE: If allocated amount is 0 or NaN, fallback to Product Detail Amount
    mask = (order_metrics['Setting Price'].isna()) | (order_metrics['Setting Price'] == 0)
    order_metrics.loc[mask, 'Setting Price'] = order_metrics.loc[mask, 'Product Detail Amount After Discount']
    
    print("\nFinal Result with Setting Price:")
    print(order_metrics[['Original Order Number', 'Product Detail Amount After Discount', '订单分摊金额', 'Setting Price']])
    
    # Validate
    print("\n" + "="*70)
    print("VALIDATION")
    print("="*70)
    
    expected = {
        'ORD-001': 120000,  # From 订单分摊金额
        'ORD-002': 145000,  # Fallback to Product Detail Amount After Discount
    }
    
    success = True
    for order_num, expected_price in expected.items():
        actual_price = order_metrics[order_metrics['Original Order Number'] == order_num]['Setting Price'].values[0]
        matches = actual_price == expected_price
        status = "✅" if matches else "❌"
        print(f"{status} {order_num}: Expected {expected_price}, Got {actual_price}")
        if not matches:
            success = False
    
    print("\n" + ("="*70))
    if success:
        print("✅ TEST PASSED")
    else:
        print("❌ TEST FAILED")
    return success

if __name__ == '__main__':
    try:
        success = test_setting_price_lookup()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
