import pandas as pd
import numpy as np
import io
import re
import xlsxwriter
from typing import Dict, Tuple
from services.price_checker_logic import SPREADSHEET_URL, CREDENTIALS_FILE
import gspread

_cached_df_names = None
_cached_client = None

def load_presales_database() -> pd.DataFrame:
    global _cached_df_names, _cached_client
    if _cached_df_names is not None:
        return _cached_df_names
        
    try:
        if _cached_client is None:
            _cached_client = gspread.service_account(filename=CREDENTIALS_FILE)
        sh = _cached_client.open_by_url(SPREADSHEET_URL)
        name_worksheet = sh.worksheet("All_Name")
        name_data = name_worksheet.get_all_values()
        
        if not name_data or len(name_data) < 2:
            return pd.DataFrame()
            
        df_names = pd.DataFrame(name_data[1:], columns=name_data[0])
        
        master_data = pd.DataFrame()
        master_data['SKU_KEY'] = df_names.iloc[:, 0].astype(str).str.strip()
        master_data['English Name'] = df_names.iloc[:, 1] if df_names.shape[1] > 1 else ""
        master_data['Image Link'] = df_names.iloc[:, 2] if df_names.shape[1] > 2 else ""
        master_data['Chinese Name'] = df_names.iloc[:, 3] if df_names.shape[1] > 3 else ""
        
        _cached_df_names = master_data
        return master_data
    except Exception as e:
        print(f"Error fetching presales master: {e}")
        return pd.DataFrame()

def process_presales(file_bytes: bytes, filename: str) -> Tuple[Dict, bytes]:
    logs = ["Reading raw file buffer..."]
    
    if filename.endswith('.csv'):
        df_raw = pd.read_csv(io.BytesIO(file_bytes), header=None, low_memory=False)
    else:
        df_raw = pd.read_excel(io.BytesIO(file_bytes), header=None)
        
    if df_raw.shape[1] == 1:
        logs.append("Detection: Single-column embed found. Splitting by comma...")
        df_raw = df_raw[0].astype(str).str.split(',', expand=True)

    STATUS_IDX = 1
    SKU_IDX = 6
    QTY_IDX = 9
    WH_IDX = 38

    if df_raw.shape[1] <= WH_IDX:
        raise ValueError(f"File has only {df_raw.shape[1]} columns. Column AM (Warehouse, index 38) is missing.")

    data = df_raw.iloc[2:].reset_index(drop=True)
    
    clean_orders = data[data[STATUS_IDX].astype(str).str.lower().str.strip() == 'to ship'].copy()
    if clean_orders.empty:
        raise ValueError("No 'To ship' records found.")

    clean_orders[QTY_IDX] = pd.to_numeric(clean_orders[QTY_IDX], errors='coerce').fillna(0)
    
    sku_data = {}
    for _, row in clean_orders.iterrows():
        qty = row[QTY_IDX]
        raw_sku_str = str(row[SKU_IDX])
        wh_name = str(row[WH_IDX]).strip() if not pd.isna(row[WH_IDX]) else "Unknown WH"
        
        if qty <= 0: continue
        
        tokens = re.split(r'[+\-/\s,|]+', raw_sku_str)
        for t in tokens:
            sku_id = t.strip()
            if len(sku_id) >= 11:
                if sku_id not in sku_data:
                    sku_data[sku_id] = {'Total QTY': 0}
                sku_data[sku_id]['Total QTY'] += qty
                sku_data[sku_id][wh_name] = sku_data[sku_id].get(wh_name, 0) + qty

    records = [{'SKU': k, **v} for k, v in sku_data.items()]
    final_matrix = pd.DataFrame(records).fillna(0)
    
    if final_matrix.empty:
       raise ValueError("No valid SKUs (length >= 11) found.")

    final_matrix = final_matrix.sort_values(by='Total QTY', ascending=False).reset_index(drop=True)
    
    master = load_presales_database()
    
    if not master.empty:
        merged = pd.merge(final_matrix, master, left_on='SKU', right_on='SKU_KEY', how='left')
        merged.drop(columns=['SKU_KEY'], inplace=True, errors='ignore')
        
        wh_cols = [c for c in final_matrix.columns if c not in ['SKU', 'Total QTY']]
        final_cols = ['SKU', 'Total QTY'] + wh_cols + ['Image Link', 'English Name', 'Chinese Name']
        final_cols = [c for c in final_cols if c in merged.columns]
        final_df = merged[final_cols]
    else:
        final_df = final_matrix

    final_df.insert(0, 'No', range(1, 1 + len(final_df)))
    
    # Fill NaN
    final_df = final_df.fillna("")

    summary = {
        "orders_found": len(clean_orders),
        "valid_skus": len(final_df),
        "total_volume": int(final_df['Total QTY'].sum()),
        "top_rows": final_df.head(10).to_dict(orient='records')
    }

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        final_df.to_excel(writer, index=False, sheet_name='Summary')
        workbook = writer.book
        worksheet = writer.sheets['Summary']
        
        header_fmt = workbook.add_format({'bold': True, 'bg_color': '#001F3F', 'font_color': 'white', 'border': 1, 'align': 'center'})
        
        for col_num, value in enumerate(final_df.columns.values):
            worksheet.write(0, col_num, value, header_fmt)
            
        worksheet.set_column('B:B', 30) # SKU
        worksheet.set_column('C:C', 12) # Total QTY
        
    return summary, output.getvalue()
