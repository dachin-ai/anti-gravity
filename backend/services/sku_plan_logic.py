import pandas as pd
import io
import math
import numpy as np
from typing import Tuple, Dict

def sanitize_json(val):
    if pd.isna(val) or (isinstance(val, float) and math.isnan(val)):
        return 0
    if isinstance(val, (np.integer, int)):
        return int(val)
    if isinstance(val, (np.floating, float)):
        return float(val)
    return val

def extract_platform_store(header_str: str) -> Tuple[str, str]:
    if not isinstance(header_str, str) or " - " not in header_str:
        return None, None
    try:
        parts = header_str.split(" - ")
        store_code = parts[0].strip()
        right_part = parts[1].strip()
        platform = right_part.split(" ")[0]
        return platform, store_code
    except:
        return None, None

def process_sku_plan(df_target: pd.DataFrame, df_grade: pd.DataFrame, month_val: str, brand_val: str) -> Tuple[pd.DataFrame, str]:
    # Parse grades
    df_grade.columns = [str(c).strip() for c in df_grade.columns]
    grade_map = dict(zip(df_grade.iloc[:, 0], df_grade.iloc[:, 1]))
    
    processed_rows = []
    store_columns = []
    
    for col in df_target.columns:
        plat, code = extract_platform_store(col)
        if plat and code:
            store_columns.append(col)
            
    if not store_columns:
        return None, "Not found any store columns with format 'KODE - Platform' in SKU Target."
        
    for idx, row in df_target.iterrows():
        if 'SKU' in df_target.columns:
            sku = row['SKU']
        else:
            sku = row.iloc[0]
            
        if pd.isna(sku) or str(sku).strip() == "":
            continue
            
        sku_str = str(sku).strip().lower()
        if sku_str in ['target', 'total', 'grand total', 'gmv']:
            continue
            
        p_grade = grade_map.get(sku, "N/A")
        
        for col_name in store_columns:
            raw_val = row[col_name]
            try:
                target_val = pd.to_numeric(raw_val, errors='coerce')
            except:
                target_val = 0
                
            if pd.isna(target_val) or target_val <= 0:
                continue
                
            platform, store_code = extract_platform_store(col_name)
            
            processed_rows.append({
                "月份/Month": month_val,
                "品牌/Brand": brand_val,
                "平台/Platform": platform,
                "店铺/Store": store_code,
                "SKU": str(sku).strip(),
                "产品等级/Product grade": str(p_grade),
                "月目标/Monthly goal": int(target_val)
            })
            
    if not processed_rows:
        return None, "All records filtered. Make sure there are target values > 0."
        
    return pd.DataFrame(processed_rows), None

def export_sku_plan_excel(df: pd.DataFrame) -> bytes:
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Cleaned Data')
        worksheet = writer.sheets['Cleaned Data']
        
        # Format headers
        header_fmt = writer.book.add_format({'bold': True, 'bg_color': '#4f46e5', 'font_color': 'white', 'align': 'center', 'valign': 'vcenter'})
        for col_num, value in enumerate(df.columns.values):
            worksheet.write(0, col_num, value, header_fmt)

        # Auto width
        for idx, col in enumerate(df.columns):
            series = df[col]
            max_len = max((series.astype(str).map(len).max(), len(str(col)))) + 2
            worksheet.set_column(idx, idx, min(max_len, 40))
            
    return output.getvalue()
