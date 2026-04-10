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
    Extracts date string 'YYYY-MM-DD' from filename pattern '_YYYYMMDD'.
    e.g. '_20260410' -> '2026-04-10'
    """
    match = re.search(r'_(\d{4})(\d{2})(\d{2})', filename)
    if match:
        year, month, day = match.groups()
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
            # Conversion file rule: Month/Year from manual_date (e.g. '2026-04')
            # But the order actual date comes from `Order Time`.
            
            # Step 1: Ensure columns exist
            required_cols = ['Order id', 'Order Status', 'Order Time', 'Item id', 'Item Name', 'Affiliate Username', 'Purchase Value(Rp)', 'Refund Amount(Rp)', 'Order Brand Commission to Affiliate(Rp)']
            
            if not all(col in df.columns for col in required_cols):
                return {"succeed": False, "message": f"CSV Conversion tidak cocok. Pastikan ada {required_cols}"}
            
            # Optional columns
            has_aff_name = 'Affiliate Name' in df.columns
            has_model_id = 'Model id' in df.columns
            has_channel = 'Channel' in df.columns
            
            new_records = []
            
            for index, row in df.iterrows():
                order_id = str(row['Order id']).strip()
                if not order_id or order_id == 'nan':
                    continue
                
                status = str(row['Order Status']).strip()
                gmv = clean_money_field(row['Purchase Value(Rp)'])
                
                # If Cancelled, use Refund Amount as GMV
                if status.lower() == 'cancelled':
                    gmv = clean_money_field(row['Refund Amount(Rp)'])
                    
                channel_raw = str(row.get('Channel', '')).strip()
                channel_label = 'Social Media'
                if 'shopeelive' in channel_raw.lower():
                    channel_label = 'Live'
                elif 'shopeevideo' in channel_raw.lower():
                    channel_label = 'Video'
                    
                order_time = row['Order Time']
                if pd.isna(order_time) or str(order_time) == 'nan':
                    order_time = None
                else:
                    try:
                        order_time = pd.to_datetime(order_time)
                    except:
                        order_time = None
                
                # Create object
                record = ShopeeAffConversion(
                    order_id=order_id,
                    store_id=store_id,
                    order_time=order_time,
                    order_status=status,
                    product_id=str(row['Item id']).strip(),
                    variation_id=str(row['Model id']).strip() if has_model_id else "",
                    product_name=str(row['Item Name']).strip(),
                    affiliate_username=str(row['Affiliate Username']).strip(),
                    affiliate_name=str(row['Affiliate Name']).strip() if has_aff_name else "",
                    purchase_value=gmv,
                    commission=clean_money_field(row['Order Brand Commission to Affiliate(Rp)']),
                    channel=channel_label
                )
                new_records.append(record)
            
            # Since conversion is ONE file per month, maybe we delete existing records for that month/store first to prevent duplicates?
            # Or we just upsert. But simpler is just bulk insert for now and handle collisions or clear based on user flow.
            # We'll clear the current store's conversion data for the uploaded month to allow re-uploading without duplication.
            # But the user selects a "month" like '2026-04'. We can extract year/month from `manual_date` and drop those matches.
            
            if manual_date and len(manual_date.split('-')) >= 2:
                year, month = manual_date.split('-')[:2]
                from sqlalchemy import cast, String
                # Delete existing records for the same store and month
                db.query(ShopeeAffConversion).filter(
                    ShopeeAffConversion.store_id == store_id,
                    cast(ShopeeAffConversion.order_time, String).like(f"{year}-{month}%")
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

            required_cols = ['export_item_id_dashboard_down_item', 'export_item_name_dashboard_down_item', 'export_sales_dashboard_down_item(Rp)', 'export_item_sold_dashboard_down_item', 'export_est_commission_dashboard_down_item(Rp)']
            
            if not all(col in df.columns for col in required_cols):
                return {"succeed": False, "message": f"CSV Product tidak cocok. Pastikan Headers sama dengan standar Shopee."}
                
            new_records = []
            for index, row in df.iterrows():
                product_id = str(row['export_item_id_dashboard_down_item']).strip()
                if not product_id or product_id == 'nan':
                    continue
                
                gmv = clean_money_field(row['export_sales_dashboard_down_item(Rp)'])
                commission = clean_money_field(row['export_est_commission_dashboard_down_item(Rp)'])
                roi = (gmv / commission) if commission > 0 else 0.0
                
                try: 
                    unit_sold = int(float(row['export_item_sold_dashboard_down_item'])) 
                except: 
                    unit_sold = 0
                
                rec = ShopeeAffProduct(
                    date=target_date,
                    store_id=store_id,
                    product_id=product_id,
                    product_name=str(row['export_item_name_dashboard_down_item']).strip(),
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

            required_cols = ['export_affiliate_username', 'export_sales_affiliate_performance(Rp)', 'export_item_sold', 'export_est_commission_affiliate_performance(Rp)']
            
            # Alternative optional
            has_name = 'export_affiliate_name' in df.columns
            has_clicks = 'export_clicks' in df.columns
            
            if not all(col in df.columns for col in required_cols):
                return {"succeed": False, "message": f"CSV Creator tidak cocok. Pastikan Headers sama dengan standar Shopee."}
                
            new_records = []
            for index, row in df.iterrows():
                username = str(row['export_affiliate_username']).strip()
                if not username or username == 'nan':
                    continue
                
                gmv = clean_money_field(row['export_sales_affiliate_performance(Rp)'])
                commission = clean_money_field(row['export_est_commission_affiliate_performance(Rp)'])
                roi = (gmv / commission) if commission > 0 else 0.0
                
                try: 
                    unit_sold = int(float(row['export_item_sold'])) 
                except: 
                    unit_sold = 0
                    
                try:
                    clicks = int(float(row['export_clicks'])) if has_clicks else 0
                except:
                    clicks = 0
                
                rec = ShopeeAffCreator(
                    date=target_date,
                    store_id=store_id,
                    affiliate_username=username,
                    affiliate_name=str(row['export_affiliate_name']).strip() if has_name else "",
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
