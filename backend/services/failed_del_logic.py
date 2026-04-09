import pandas as pd
import io
import xlsxwriter
from typing import Dict, Any, Tuple
import math

def clean_currency(x):
    if isinstance(x, (int, float)):
        return float(x)
    try:
        return float(str(x).replace(',', '').replace('Rp', '').replace('IDR', '').strip())
    except:
        return 0.0

def categorize_sku(sku):
    sku_upper = str(sku).upper().strip()
    if sku_upper.startswith("FR"): return "FR"
    elif sku_upper.startswith("EMFR"): return "EMFR"
    elif sku_upper.startswith("EC"): return "EC"
    elif sku_upper.startswith("CO"): return "CO"
    return None

def is_cod(payment_method):
    if pd.isna(payment_method): return False
    payment_str = str(payment_method).lower().strip()
    return "cash on delivery" in payment_str or "cod" in payment_str

def sanitize_json(val):
    if pd.isna(val) or (isinstance(val, float) and math.isnan(val)):
        return 0
    return val

def process_failed_delivery(df: pd.DataFrame, name_map: Dict[str, str]) -> Tuple[Dict, bytes]:
    # Column mapping logic
    try:
        col_map = {
            'order_id': df.columns[0],
            'order_type': df.columns[4],
            'seller_sku': df.columns[6],
            'qty': df.columns[9],
            'amount': df.columns[28],
            'reason': df.columns[36],
            'payment': df.columns[54]
        }
    except IndexError as e:
        raise ValueError(f"File has only {df.shape[1]} columns. Expected at least 55 columns from TikTok Shop Seller Center.")

    df['clean_amount'] = df[col_map['amount']].apply(clean_currency)
    df['clean_qty'] = df[col_map['qty']].apply(lambda x: float(x) if str(x).replace('.', '', 1).isdigit() else 1.0)
    df[col_map['reason']] = df[col_map['reason']].fillna("Unknown")
    df[col_map['payment']] = df[col_map['payment']].fillna("Unknown")
    df[col_map['order_type']] = df[col_map['order_type']].fillna("Unknown")

    sku_rows = []
    
    for idx, row in df.iterrows():
        raw_sku = str(row[col_map['seller_sku']]).strip()
        order_qty = float(row['clean_qty'])
        
        parts = raw_sku.replace('-', '+').split('+')
        
        for part in parts:
            clean_part = part.strip()
            if not clean_part or clean_part.lower() == 'nan':
                continue
            
            category = categorize_sku(clean_part)
            # Use name_map from Google Sheets
            product_name = name_map.get(clean_part, "Unknown")
            
            sku_rows.append({
                'SKU': clean_part,
                'Product Name': product_name,
                'Category': category,
                'Qty': order_qty,
                'Order Type': row[col_map['order_type']],
                'Reason': row[col_map['reason']],
                'Payment': row[col_map['payment']],
                'Amount': float(row['clean_amount'])
            })
    
    df_sku = pd.DataFrame(sku_rows)
    
    # Calculate Overview summaries for JSON response
    total_orders = len(df)
    total_items = int(df_sku['Qty'].sum()) if len(df_sku) > 0 else 0
    total_val = df['clean_amount'].sum()
    unique_skus = df_sku['SKU'].nunique() if len(df_sku) > 0 else 0
    
    df_sku_valid = df_sku[df_sku['Category'].notna()]
    top_sku_series = df_sku_valid.groupby(['SKU', 'Product Name'])['Qty'].sum().nlargest(5)
    top_skus = [{"sku": idx[0], "name": idx[1], "qty": int(val)} for idx, val in top_sku_series.items()]
    
    top_reason = [{"reason": str(k), "count": int(v)} for k, v in df[col_map['reason']].value_counts().nlargest(5).items()]
    top_payment = [{"payment": str(k), "count": int(v)} for k, v in df[col_map['payment']].value_counts().nlargest(5).items()]

    cod_mask_df = df[col_map['payment']].apply(is_cod)
    cod_order_count = int(cod_mask_df.sum())

    summary = {
        "total_orders": total_orders,
        "total_items": total_items,
        "total_value": sanitize_json(total_val),
        "unique_skus": unique_skus,
        "cod_orders": cod_order_count,
        "top_skus": top_skus,
        "top_reasons": top_reason,
        "top_payments": top_payment
    }

    # Generate Excel Report
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output, {'in_memory': True})
    
    header_fmt = workbook.add_format({'bold': True, 'font_color': 'white', 'bg_color': '#4f46e5', 'align': 'center', 'valign': 'vcenter'})
    cell_fmt = workbook.add_format({'align': 'left', 'valign': 'vcenter'})
    num_fmt = workbook.add_format({'align': 'right', 'num_format': '#,##0'})
    
    # Simple SKU summarize for now to save rendering time
    ws1 = workbook.add_worksheet("Extracted SKUs")
    ws1.set_column('A:E', 20)
    
    headers = ['Category', 'SKU', 'Product Name', 'Total Qty', 'Reason', 'Payment']
    for i, h in enumerate(headers):
        ws1.write(0, i, h, header_fmt)

    if len(df_sku) > 0:
        agg = df_sku.groupby(['Category', 'SKU', 'Product Name', 'Reason', 'Payment']).agg({'Qty': 'sum'}).reset_index()
        for r_idx, row in enumerate(agg.values):
            for c_idx, val in enumerate(row):
                if c_idx == 5: # Qty
                    ws1.write(r_idx+1, c_idx, val, num_fmt)
                else:
                    ws1.write(r_idx+1, c_idx, str(val), cell_fmt)
                    
    # Original Filtered Sheet
    ws2 = workbook.add_worksheet("Clean Orders")
    ws2.set_column('A:G', 18)
    
    headers2 = ['Order ID', 'Type', 'SKU', 'Qty', 'Amount', 'Reason', 'Payment']
    for i, h in enumerate(headers2): ws2.write(0, i, h, header_fmt)
    
    for r_idx, row in enumerate(df[[col_map['order_id'], col_map['order_type'], col_map['seller_sku'], col_map['qty'], 'clean_amount', col_map['reason'], col_map['payment']]].values):
         for c_idx, val in enumerate(row):
              if c_idx in [3, 4]: ws2.write(r_idx+1, c_idx, sanitize_json(val), num_fmt)
              else: ws2.write(r_idx+1, c_idx, str(val), cell_fmt)

    workbook.close()
    return summary, output.getvalue()
