#!/usr/bin/env python3
import pandas as pd
import sys
sys.path.insert(0, '.')
from services.order_loss_logic import run_order_loss_audit
from services.price_checker_logic import load_product_database

# Read the uploaded file
file_path = r"c:\Users\denaf\Downloads\待审核订单 (2).xlsx"
try:
    df = pd.read_excel(file_path)
    print("✓ File loaded successfully")
    print(f"\nShape: {df.shape}")
    print(f"\nColumns: {list(df.columns)}")
    print(f"\nFirst 2 rows:")
    print(df.head(2).to_string())
    print("\n" + "="*80)
    
    # Try to run the audit
    print("\nLoading price database...")
    price_db, name_map, link_map = load_product_database()
    print(f"✓ Price database loaded: {len(price_db)} items")
    
    print("\nRunning order loss audit...")
    summary, excel_bytes = run_order_loss_audit(df, price_db, price_type="Warning", method="Profit Review")
    
    print("\n✓ AUDIT COMPLETED SUCCESSFULLY!")
    print(f"\nSummary:")
    for key, val in summary.items():
        print(f"  {key}: {val}")
    
    # Save the result
    output_path = r"c:\Users\denaf\Antigravity Project\backend\audit_result.xlsx"
    with open(output_path, 'wb') as f:
        f.write(excel_bytes)
    print(f"\n✓ Excel file saved to: {output_path}")
    
except Exception as e:
    import traceback
    print(f"\n✗ Error: {e}")
    print("\nFull traceback:")
    traceback.print_exc()
