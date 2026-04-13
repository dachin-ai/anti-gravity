import pandas as pd
import numpy as np
import io
import re
import os
import gspread
from datetime import datetime
from sqlalchemy.orm import Session
from models import ShopeeAffConversion, ShopeeAffProduct, ShopeeAffCreator
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1GoIpse2K5piWfw5J1urkoZj6KWY3zBo8UX0TAmvUZ1M"

if os.path.exists("/etc/secrets/credentials.json"):
    CREDENTIALS_FILE = "/etc/secrets/credentials.json"
else:
    CREDENTIALS_FILE = "credentials.json"

def get_shopee_stores() -> List[Dict[str, str]]:
    """
    Fetches the store list from AT1 sheet.
    Returns: [{'code': 'FR02OS001', 'name': 'FR02OS001 - Shopee Official'}, ...]
    """
    try:
        gc = gspread.service_account(filename=CREDENTIALS_FILE)
        sh = gc.open_by_url(SPREADSHEET_URL)
        worksheet = sh.worksheet("AT1")
        
        # Read all records
        data = worksheet.get_all_records()
        
        stores = []
        for row in data:
            code = str(row.get('Code', '')).strip()
            full_name = str(row.get('Full Name', '')).strip()
            platform = str(row.get('Platform', '')).strip()
            
            # Since the user specifically showed Shopee stores in the screenshot for Shopee Affiliate
            # And requested AT1 Code & Full Name:
            if code and platform.lower() == 'shopee':
                stores.append({
                    "code": code,
                    "name": full_name
                })
        
        # Deduplicate just in case
        seen = set()
        unique_stores = []
        for store in stores:
            if store['code'] not in seen:
                seen.add(store['code'])
                unique_stores.append(store)
                
        return unique_stores
    except Exception as e:
        print(f"Error fetching AT1 stores: {e}")
        return []

def clean_money_field(val: Any) -> float:
    """
    Cleans erratic money strings from Shopee CSV.
    Often they look like "1.200.000,50" or just standard floats.
    """
    if pd.isna(val):
        return 0.0
    
    if isinstance(val, (int, float)):
        return float(val)
    
    val = str(val).strip()
    if not val or val == '--':
        return 0.0
        
    try:
        # Check if comma is used as decimal separator (e.g. 1.000,50 vs 1000.50)
        # Standard Indonesian format uses dot for thousands and comma for decimal
        if ',' in val and '.' in val:
            # 1.200.000,50 -> 1200000.50
            if val.rfind(',') > val.rfind('.'):
                val = val.replace('.', '')
                val = val.replace(',', '.')
            # 1,200,000.50 -> 1200000.50
            else:
                val = val.replace(',', '')
        elif ',' in val and '.' not in val:
            # Could be "1,5" meaning 1.5 or "1,200" meaning 1200
            # If after comma is exactly two digits, it's usually cents. Else remove.
            # Simpler rule for Shopee data: If it strictly represents money, remove all non-digits except dots/commas
            # Wait, Shopee CSV usually outputs plain formats like 13000.50. Let's just be careful.
            if len(val.split(',')[-1]) <= 2:
                val = val.replace(',', '.')
            else:
                val = val.replace(',', '')
                
        # Remove any other non-numeric character except decimal dot
        val = re.sub(r'[^\d.]', '', val)
        if val.count('.') > 1: # somehow multiple dots, remove all but last
            parts = val.split('.')
            val = "".join(parts[:-1]) + "." + parts[-1]
            
        return float(val) if val else 0.0
    except BaseException as e:
        print(f"Error casting money {val}: {e}")
        return 0.0
    
def extract_date_from_filename(filename: str) -> Optional[str]:
    """
    Extracts date string 'YYYY-MM-DD' from filename.
    Supports multiple patterns:
    - _YYYYMMDD  (e.g. _20260401)
    - _YYYYMMDDHHMMSS (e.g. _202604011459)
    - YYYYMMDD anywhere (e.g. 202604101458-OS1April2026)
    """
    # Try '_YYYYMMDD' prefix first (most specific)
    match = re.search(r'_(\d{4})(\d{2})(\d{2})(?:\d{4})?', filename)
    if match:
        year, month, day = match.groups()
        return f"{year}-{month}-{day}"
    # Try loose YYYYMMDD anywhere in filename
    match = re.search(r'(\d{4})(\d{2})(\d{2})', filename)
    if match:
        year, month, day = match.groups()
        # Basic sanity check
        if 2020 <= int(year) <= 2035 and 1 <= int(month) <= 12 and 1 <= int(day) <= 31:
            return f"{year}-{month}-{day}"
    return None

def process_and_save_upload(db: Session, file_content: bytes, filename: str, file_type: str, store_id: str, manual_date: str = None) -> Dict[str, Any]:
    """
    ETL processing for Shopee Affiliate files.
    """
    try:
        # Detect delimiter (Shopee CSV can use comma or semicolon depending on regional settings)
        line = file_content[:1024].decode('utf-8', errors='ignore')
        sep = ';' if line.count(';') > line.count(',') else ','
        
        df = pd.read_csv(io.BytesIO(file_content), sep=sep, header=0, dtype=str)
        # Drop completely empty rows
        df.dropna(how='all', inplace=True)
        
        records_processed = 0
        
        if file_type == 'conversion':
            # --- Flexible column mapping for Conversion ---
            # Shopee sometimes changes column names slightly across regions/periods.
            # We find columns by key identifiers rather than exact match.
            actual_cols = list(df.columns)
            
            def find_col(candidates):
                """Find first matching column from candidates list (case-insensitive partial match)."""
                for c in candidates:
                    for col in actual_cols:
                        if c.lower() == col.lower():
                            return col
                # Partial match fallback
                for c in candidates:
                    for col in actual_cols:
                        if c.lower() in col.lower():
                            return col
                return None

            col_order_id   = find_col(['Order id', 'Order ID', 'OrderId'])
            col_status     = find_col(['Order Status', 'OrderStatus'])
            col_time       = find_col(['Order Time', 'OrderTime'])
            col_item_id    = find_col(['Item id', 'Item ID', 'ItemId'])
            col_item_name  = find_col(['Item Name', 'ItemName'])
            col_model_id   = find_col(['Model id', 'Model ID', 'ModelId', 'Variation'])
            col_aff_name   = find_col(['Affiliate Name'])
            col_aff_user   = find_col(['Affiliate Username', 'Affiliate User'])
            col_pv         = find_col(['Purchase Value(Rp)', 'Purchase Value', 'GMV'])
            col_refund     = find_col(['Refund Amount(Rp)', 'Refund Amount'])
            col_commission = find_col(['Order Brand Commission to Affiliate(Rp)', 'Brand Commission to Affiliate', 'Commission to Affiliate'])
            col_channel    = find_col(['Channel'])

            # Validate critical columns
            missing = []
            if not col_order_id:   missing.append('Order id')
            if not col_status:     missing.append('Order Status')
            if not col_time:       missing.append('Order Time')
            if not col_item_id:    missing.append('Item id')
            if not col_aff_user:   missing.append('Affiliate Username')
            if not col_pv:         missing.append('Purchase Value(Rp)')

            if missing:
                found_preview = actual_cols[:10]
                return {"succeed": False, "message": f"CSV Conversion tidak cocok. Kolom yang tidak ditemukan: {missing}. Kolom yang ada di file: {found_preview}..."}

            new_records = []

            for index, row in df.iterrows():
                order_id = str(row[col_order_id]).strip()
                if not order_id or order_id == 'nan':
                    continue

                status = str(row[col_status]).strip()
                gmv = clean_money_field(row[col_pv])

                # If Cancelled, use Refund Amount as GMV
                if status.lower() in ['cancelled', 'canceled'] and col_refund:
                    refund_val = clean_money_field(row[col_refund])
                    if refund_val > 0:
                        gmv = refund_val

                channel_raw = str(row[col_channel]).strip() if col_channel else ''
                channel_label = 'Social Media'
                if 'shopeelive' in channel_raw.lower():
                    channel_label = 'Live'
                elif 'shopeevideo' in channel_raw.lower():
                    channel_label = 'Video'

                order_time = row[col_time]
                if pd.isna(order_time) or str(order_time) == 'nan':
                    order_time = None
                else:
                    try:
                        order_time = pd.to_datetime(order_time)
                    except:
                        order_time = None

                record = ShopeeAffConversion(
                    order_id=order_id,
                    store_id=store_id,
                    order_time=order_time,
                    order_status=status,
                    product_id=str(row[col_item_id]).strip() if col_item_id else "",
                    variation_id=str(row[col_model_id]).strip() if col_model_id else "",
                    product_name=str(row[col_item_name]).strip() if col_item_name else "",
                    affiliate_username=str(row[col_aff_user]).strip(),
                    affiliate_name=str(row[col_aff_name]).strip() if col_aff_name else "",
                    purchase_value=gmv,
                    commission=clean_money_field(row[col_commission]) if col_commission else 0.0,
                    channel=channel_label
                )
                new_records.append(record)

            # Auto-detect months to replace from the parsed records
            from sqlalchemy import cast, String
            months_to_replace = set()
            for r in new_records:
                if r.order_time:
                    months_to_replace.add(r.order_time.strftime('%Y-%m'))
            
            for ym in months_to_replace:
                db.query(ShopeeAffConversion).filter(
                    ShopeeAffConversion.store_id == store_id,
                    cast(ShopeeAffConversion.order_time, String).like(f"{ym}%")
                ).delete(synchronize_session=False)

            db.bulk_save_objects(new_records)
            db.commit()
            records_processed = len(new_records)
            
        elif file_type == 'product':
            # Use manual_date extracted from filename
            if not manual_date:
                manual_date = extract_date_from_filename(filename)
                if not manual_date:
                    return {"succeed": False, "message": "Gagal mendeteksi tanggal dari nama file Product. Gunakan format _YYYYMMDD."}
            
            # Delete existing data for that exact date and store
            target_date = datetime.strptime(manual_date, '%Y-%m-%d').date()
            db.query(ShopeeAffProduct).filter(
                ShopeeAffProduct.store_id == store_id,
                ShopeeAffProduct.date == target_date
            ).delete(synchronize_session=False)

            actual_cols = list(df.columns)
            def find_col(candidates):
                for c in candidates:
                    for col in actual_cols:
                        if c.strip().lower() == col.strip().lower():
                            return col
                for c in candidates:
                    for col in actual_cols:
                        if c.strip().lower() in col.strip().lower():
                            return col
                return None

            col_id = find_col(['export_item_id', 'Item id', 'Item ID'])
            col_name = find_col(['export_item_name', 'Item Name'])
            col_gmv = find_col(['export_sales', 'Sales(Rp)', 'Sales'])
            col_sold = find_col(['export_item_sold', 'Item Sold'])
            col_comm = find_col(['export_est_commission', 'Est. Commission', 'Commission'])

            missing = []
            if not col_id: missing.append('Item ID')
            if not col_name: missing.append('Item Name')
            if not col_gmv: missing.append('Sales')
            if not col_sold: missing.append('Item Sold')
            if not col_comm: missing.append('Commission')
            
            if missing:
                return {"succeed": False, "message": f"CSV Product tidak cocok. Kolom hilang: {missing}. Ditemukan: {actual_cols[:5]}..."}
                
            new_records = []
            for index, row in df.iterrows():
                product_id = str(row[col_id]).strip()
                if not product_id or product_id == 'nan':
                    continue
                
                gmv = clean_money_field(row[col_gmv])
                commission = clean_money_field(row[col_comm])
                roi = (gmv / commission) if commission > 0 else 0.0
                
                try: 
                    unit_sold = int(float(row[col_sold])) 
                except: 
                    unit_sold = 0
                
                rec = ShopeeAffProduct(
                    date=target_date,
                    store_id=store_id,
                    product_id=product_id,
                    product_name=str(row[col_name]).strip(),
                    gmv=gmv,
                    unit_sold=unit_sold,
                    commission=commission,
                    roi=roi
                )
                new_records.append(rec)
            db.bulk_save_objects(new_records)
            db.commit()
            records_processed = len(new_records)

        elif file_type == 'creator':
            # Use manual_date extracted from filename
            if not manual_date:
                manual_date = extract_date_from_filename(filename)
                if not manual_date:
                    return {"succeed": False, "message": "Gagal mendeteksi tanggal dari nama file Creator. Gunakan format _YYYYMMDD."}
            
            # Delete existing data for that exact date and store
            target_date = datetime.strptime(manual_date, '%Y-%m-%d').date()
            db.query(ShopeeAffCreator).filter(
                ShopeeAffCreator.store_id == store_id,
                ShopeeAffCreator.date == target_date
            ).delete(synchronize_session=False)

            actual_cols = list(df.columns)
            def find_col(candidates):
                for c in candidates:
                    for col in actual_cols:
                        if c.strip().lower() == col.strip().lower(): return col
                for c in candidates:
                    for col in actual_cols:
                        if c.strip().lower() in col.strip().lower(): return col
                return None

            col_username = find_col(['export_affiliate_username', 'Username', 'Affiliate Username'])
            col_gmv = find_col(['export_sales_affiliate_performance', 'Sales', 'GMV'])
            col_sold = find_col(['export_item_sold', 'Item Sold'])
            col_comm = find_col(['export_est_commission_affiliate_performance', 'Est. Commission', 'Commission'])
            col_name = find_col(['export_affiliate_name', 'Affiliate Name', 'Name'])
            col_clicks = find_col(['export_clicks', 'Clicks'])
            
            missing = []
            if not col_username: missing.append('Username')
            if not col_gmv: missing.append('Sales')
            if not col_sold: missing.append('Item Sold')
            if not col_comm: missing.append('Commission')

            if missing:
                return {"succeed": False, "message": f"CSV Creator tidak cocok. Kolom hilang: {missing}. Ditemukan: {actual_cols[:5]}..."}
                
            new_records = []
            for index, row in df.iterrows():
                username = str(row[col_username]).strip()
                if not username or username == 'nan':
                    continue
                
                gmv = clean_money_field(row[col_gmv])
                commission = clean_money_field(row[col_comm])
                roi = (gmv / commission) if commission > 0 else 0.0
                
                try: 
                    unit_sold = int(float(row[col_sold])) 
                except: 
                    unit_sold = 0
                    
                try:
                    clicks = int(float(row[col_clicks])) if col_clicks else 0
                except:
                    clicks = 0
                
                rec = ShopeeAffCreator(
                    date=target_date,
                    store_id=store_id,
                    affiliate_username=username,
                    affiliate_name=str(row[col_name]).strip() if col_name else "",
                    gmv=gmv,
                    unit_sold=unit_sold,
                    clicks=clicks,
                    commission=commission,
                    roi=roi
                )
                new_records.append(rec)
            db.bulk_save_objects(new_records)
            db.commit()
            records_processed = len(new_records)
        else:
            return {"succeed": False, "message": "Tipe file tidak valid."}

        return {"succeed": True, "message": f"Berhasil menyimpan {records_processed} baris data.", "records": records_processed}
        
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        return {"succeed": False, "message": f"Error memproses file: {str(e)}"}
