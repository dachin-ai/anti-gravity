import pandas as pd
import numpy as np
import io
import re
import os
import gspread
from typing import Tuple, Dict, Any, List
from database import SessionLocal
from models import FreemirPrice, FreemirName
from services.product_performance_logic import get_sku_photo_map, parse_sku_tokens

SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1aS1wpEJ5jIYFYYsZT1U4-gabyb5XwGn4u1-OpRhiucc"

if os.path.exists("/etc/secrets/credentials.json"):
    CREDENTIALS_FILE = "/etc/secrets/credentials.json"
else:
    CREDENTIALS_FILE = "credentials.json"

PRICE_TYPES = [
    "Warning", "Daily-Discount", "Daily-Livestream", "Daily-Mid-Creator",
    "Daily-Top-Creator", "Daily-FS", "Daily-Shopee-FS", "DD-FS",
    "DD-Shoptab", "DD-Livestream", "DD-Mid-Creator", "DD-Top-Creator",
    "PD-Shoptab", "PD-Livestream", "PD-Mid-Creator", "PD-Top-Creator"
]

SHEET_CONFIG = [
    ("All", PRICE_TYPES),
    ("Account Responsible", ["Warning", "Daily-Discount", "Daily-FS", "Daily-Shopee-FS", "DD-FS", "DD-Shoptab", "PD-Shoptab"]),
    ("Livestreamer", ["Warning", "Daily-Livestream", "DD-Livestream", "PD-Livestream"]),
    ("Affiliate", ["Warning", "Daily-Mid-Creator", "Daily-Top-Creator", "DD-Mid-Creator", "DD-Top-Creator", "PD-Mid-Creator", "PD-Top-Creator"])
]

_cached_price_db = None
_cached_name_map = None
_cached_link_map = None
_cached_client = None

def _is_image_url(url: str) -> bool:
    if not url or not isinstance(url, str):
        return False
    return bool(re.search(r"\.(jpe?g|png|gif|webp|svg)(\?|$)", url, re.IGNORECASE))


def _is_combined_sku_name(name: str, sku: str) -> bool:
    if not name or not sku:
        return False
    normalized = str(name).strip()
    if normalized == sku:
        return False
    if any(d in normalized for d in ['+', '-', '|', ',', '/']):
        tokens = parse_sku_tokens(normalized)
        return len(tokens) > 1 and sku in normalized
    return False


def _normalize_sku_name(sku: str, name: str) -> str:
    if not name or _is_combined_sku_name(name, sku):
        return sku
    return str(name).strip()


def load_product_database() -> Tuple[Dict, Dict, Dict]:
    global _cached_price_db, _cached_name_map, _cached_link_map
    if _cached_price_db is not None:
        return _cached_price_db, _cached_name_map, _cached_link_map
        
    db = SessionLocal()
    try:
        prices = db.query(FreemirPrice).all()
        names = db.query(FreemirName).all()
        
        price_db = {}
        for p in prices:
            item = {"Category": p.category, "Clearance": p.clearance}
            if p.prices:
                item.update(p.prices)
            price_db[p.sku] = item
            
        name_map = {}
        link_map = {}
        for n in names:
            name_map[n.sku] = n.product_name
            link_map[n.sku] = n.link
            
        _cached_price_db = price_db
        _cached_name_map = name_map
        _cached_link_map = link_map
        return price_db, name_map, link_map
    except Exception as e:
        print(f"Error fetching from DB: {e}")
        return {}, {}, {}
    finally:
        db.close()

def sync_google_sheets_to_neon() -> int:
    """Sync Google Sheets price data to Neon PostgreSQL database (optimized with timeout & bulk operations)"""
    db = None
    try:
        print("[Sync] Initializing Google Sheets connection...")
        client = gspread.service_account(filename=CREDENTIALS_FILE)
        sh = client.open_by_url(SPREADSHEET_URL)

        db = SessionLocal()
        count = 0

        # ===== SYNC PRICE DATA =====
        print("[Sync] Fetching Price worksheet...")
        price_worksheet = sh.worksheet("Price")
        price_data = price_worksheet.get_all_values()

        if price_data:
            cols = price_data[0]
            df_price = pd.DataFrame(price_data[1:], columns=cols)
            df_price = df_price[df_price.iloc[:, 0].astype(str).str.strip() != ""]

            sku_col = cols[0]
            cat_col = "Category" if "Category" in cols else None
            clear_col = "Clearance" if "Clearance" in cols else None

            print(f"[Sync] Processing {len(df_price)} price records...")

            skus_to_update = {}
            for _, row in df_price.iterrows():
                sku_val = str(row[sku_col]).strip()
                if not sku_val:
                    continue

                cat_val = str(row[cat_col]) if cat_col and cat_col in row else ""
                clear_val = str(row[clear_col]) if clear_col and clear_col in row else ""

                prices_dict = {}
                for pt in PRICE_TYPES:
                    if pt in row and str(row[pt]).strip():
                        try:
                            prices_dict[pt] = float(str(row[pt]).replace(",", ""))
                        except:
                            pass

                skus_to_update[sku_val] = {
                    'sku': sku_val,
                    'category': cat_val,
                    'clearance': clear_val,
                    'prices': prices_dict
                }

            db.query(FreemirPrice).delete()
            db.commit()

            if skus_to_update:
                db.bulk_insert_mappings(FreemirPrice, list(skus_to_update.values()))
                db.commit()
                count = len(skus_to_update)
                print(f"[Sync] Synced {count} price records")

        # ===== SYNC NAME DATA =====
        print("[Sync] Fetching All_Name worksheet...")
        try:
            name_worksheet = sh.worksheet("All_Name")
            name_data = name_worksheet.get_all_values()

            at2_data = []
            try:
                at2_sheet = sh.worksheet("AT2")
                at2_data = at2_sheet.get_all_values()
            except Exception as e:
                print(f"[Sync] AT2 sheet unavailable: {e}")

            if name_data:
                df_names = pd.DataFrame(name_data[1:], columns=name_data[0])
                df_names = df_names[df_names.iloc[:, 0].astype(str).str.strip() != ""]

                sku_c = df_names.columns[0]
                name_c = next((c for c in ["English name", "Product Name", "Name", "Rodcyt Name", "rodcyt name", "rodcyt"] if c in df_names.columns), (df_names.columns[1] if len(df_names.columns) > 1 else None))
                link_c = next((c for c in ["Image", "Image URL", "Image Link", "Link", "URL", "Product Link"] if c in df_names.columns), (df_names.columns[2] if len(df_names.columns) > 2 else None))

                at2_name_map = {}
                at2_link_map = {}
                if at2_data and len(at2_data) > 1:
                    at2_cols = [str(c).strip() for c in at2_data[0]]
                    try:
                        sku_idx = next(i for i, v in enumerate(at2_cols) if v.lower() == 'sku')
                    except StopIteration:
                        sku_idx = 2 if len(at2_cols) > 2 else None
                    try:
                        name_idx = next(i for i, v in enumerate(at2_cols) if v.lower() in ('name', 'product name', 'item name', 'display name'))
                    except StopIteration:
                        name_idx = 3 if len(at2_cols) > 3 else None
                    try:
                        link_idx = next(i for i, v in enumerate(at2_cols) if v.lower() in ('link', 'url', 'product url', 'product_link', 'product link', 'detail url'))
                    except StopIteration:
                        link_idx = 4 if len(at2_cols) > 4 else None

                    for row in at2_data[1:]:
                        if sku_idx is None:
                            continue
                        sku_value = str(row[sku_idx]).strip() if len(row) > sku_idx else ''
                        if not sku_value:
                            continue
                        if name_idx is not None and len(row) > name_idx:
                            at2_name_map[sku_value] = str(row[name_idx]).strip()
                        if link_idx is not None and len(row) > link_idx:
                            at2_link_map[sku_value] = str(row[link_idx]).strip()

                def expand_skus(raw_value: str):
                    if pd.isna(raw_value) or not str(raw_value).strip():
                        return []
                    parts = re.split(r'[+\-,|]+', str(raw_value))
                    return [p.strip() for p in parts if p.strip()]

                print(f"[Sync] Processing {len(df_names)} product names...")

                names_to_insert = []
                for _, row in df_names.iterrows():
                    raw_sku = str(row[sku_c]).strip()
                    if not raw_sku:
                        continue

                    raw_name = str(row[name_c]).strip() if name_c and name_c in row else ""
                    raw_link = str(row[link_c]).strip() if link_c and link_c in row else ""
                    skus = expand_skus(raw_sku)
                    if len(skus) > 1:
                        # Skip bundle/combo rows for individual SKU product name and image assignment.
                        raw_name = ""
                        raw_link = ""
                    for sku in skus:
                        name_value = at2_name_map.get(sku, raw_name)
                        link_value = at2_link_map.get(sku, raw_link)
                        names_to_insert.append({
                            'sku': sku,
                            'product_name': name_value,
                            'link': link_value
                        })

                db.query(FreemirName).delete()
                db.commit()

                if names_to_insert:
                    seen = set()
                    unique_names = []
                    for item in names_to_insert:
                        if item['sku'] not in seen:
                            seen.add(item['sku'])
                            unique_names.append(item)
                    db.bulk_insert_mappings(FreemirName, unique_names)
                    db.commit()
                    print(f"[Sync] Synced {len(unique_names)} product names (from {len(names_to_insert)} total entries)")
        except Exception as e:
            print(f"[Sync] Warning: Could not sync product names: {e}")

        global _cached_price_db, _cached_name_map, _cached_link_map
        _cached_price_db = None
        _cached_name_map = None
        _cached_link_map = None

        print(f"[Sync] ✓ Sync complete: {count} price records updated")
        return count
    except Exception as e:
        print(f"[Sync] ✗ Error syncing Google Sheets to Neon: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        if db:
            db.close()

# Keep old function name for backward compatibility
def sync_google_sheets_to_vps_postgres() -> int:
    """Deprecated: Use sync_google_sheets_to_neon() instead"""
    return sync_google_sheets_to_neon()

def clean_sku_list(sku_string: str) -> List[str]:
    if pd.isna(sku_string) or not sku_string: return []
    parts = re.split(r'[+\-,|]+', str(sku_string))
    return [p.strip() for p in parts if p.strip()]

def parse_idr_price(val: Any) -> float:
    if val is None: return 0.0
    # Already numeric (from Neon DB JSON) — return directly, avoid stripping decimal point
    if isinstance(val, (int, float)):
        return 0.0 if val != val else float(val)  # guard NaN
    val_str = str(val).strip()
    if not val_str or val_str.lower() in ('', 'nan', 'none'): return 0.0
    # Try direct float first (handles "15000.0", "15000")
    try:
        return float(val_str)
    except ValueError:
        pass
    # Last resort: strip everything except digits (e.g. "Rp 15,000" from raw sheets)
    digits = re.sub(r'[^\d]', '', val_str)
    return float(digits) if digits else 0.0

def get_bundle_discount_rate(count: int) -> float:
    if count == 1: return 0.0
    elif count == 2: return 0.02
    elif count == 3: return 0.03
    elif count == 4: return 0.045
    elif count >= 5: return 0.05
    return 0.0

def generate_breakdown_table(sku_string: str, price_db: Dict, name_map: Dict) -> List[Dict]:
    skus = clean_sku_list(sku_string)
    sku_count = len(skus)
    if sku_count == 0: return []

    base_disc = get_bundle_discount_rate(sku_count)
    breakdown_data = []

    has_normal = False
    for sku in skus:
        cat = str(price_db.get(sku, {}).get("Category", "")).lower()
        if "gift" not in cat:
            has_normal = True

    total_raw_warning = 0.0
    total_discounted_warning = 0.0
    for sku in skus:
        item_data = price_db.get(sku, {})
        cat = str(item_data.get("Category", "")).lower()
        is_gift = "gift" in cat
        gift_factor = 0.5 if is_gift and sku_count > 1 and has_normal else 1.0

        c_val = parse_idr_price(item_data.get("Clearance", 0))
        is_clearance = c_val >= 1
        raw_base = item_data.get("Warning", 0)
        base_price_float = parse_idr_price(raw_base)

        if is_clearance:
            total_raw_warning += c_val
            total_discounted_warning += c_val
        else:
            total_raw_warning += base_price_float
            total_discounted_warning += base_price_float * gift_factor * (1 - base_disc)

    hit_floor = total_discounted_warning < total_raw_warning

    for sku in skus:
        item_data = price_db.get(sku, {})
        name = name_map.get(sku, "-")
        cat = str(item_data.get("Category", "")).lower()
        is_gift = "gift" in cat
        gift_factor = 0.5 if is_gift and sku_count > 1 and has_normal else 1.0

        c_val = parse_idr_price(item_data.get("Clearance", 0))
        is_clearance = c_val >= 1

        raw_base = item_data.get("Warning", 0)
        base_price_float = parse_idr_price(raw_base)

        if is_clearance:
            final_price = c_val
            logic_applied = "Clearance Override"
        else:
            if hit_floor:
                final_price = base_price_float
                logic_applied = "Floor Protection Applied"
            else:
                final_price = base_price_float * gift_factor * (1 - base_disc)
                logic_list = []
                if is_gift and sku_count > 1 and has_normal: logic_list.append("Gift (50%)")
                if base_disc > 0: logic_list.append(f"Bundle Disc ({base_disc*100}%)")
                logic_applied = " + ".join(logic_list) if logic_list else "Normal Price"

        breakdown_data.append({
            "SKU": sku,
            "Product Name": name,
            "Base Price (Warning)": int(base_price_float),
            "Logic Applied": logic_applied,
            "Total Contribution (IDR)": int(round(final_price))
        })

    return breakdown_data

def calculate_prices(sku_string: str, price_db: Dict, name_map: Dict, link_map: Dict) -> Dict:
    skus = clean_sku_list(sku_string)
    sku_count = len(skus)
    result = {}
    sku_items = []
    
    db = SessionLocal()
    try:
        photo_map = get_sku_photo_map(db, set(skus))
    finally:
        db.close()

    for i, sku in enumerate(skus):
        idx = i + 1
        raw_name = name_map.get(sku, "") or ""
        sku_name = _normalize_sku_name(sku, raw_name)
        sku_link = link_map.get(sku, "") or ""
        image_url = None
        if _is_image_url(sku_link):
            image_url = sku_link
        elif photo_map.get(sku):
            image_url = photo_map.get(sku)

        result[f"SKU {idx} Name"] = sku_name
        result[f"SKU {idx} Link"] = sku_link
        sku_items.append({
            "sku": sku,
            "name": sku_name,
            "link": sku_link,
            "image": image_url
        })

    if sku_count == 0:
        result.update({
            "Bundle Discount": 0, "Mark Clearance": "-", "Mark Gift": "-",
            **{k: "Invalid" for k in PRICE_TYPES},
            "sku_items": []
        })
        return result

    base_discount_rate = get_bundle_discount_rate(sku_count)
    total_prices = {k: 0.0 for k in PRICE_TYPES}
    is_valid = {k: True for k in PRICE_TYPES} 
    
    has_clearance = False
    has_gift = False
    all_skus_found = True
    
    for sku in skus:
        if not price_db.get(sku):
            all_skus_found = False
            break
    
    if not all_skus_found:
        result.update({
            "Bundle Discount": "", "Mark Clearance": "", "Mark Gift": "",
            **{k: "Invalid" for k in PRICE_TYPES}
        })
        return result

    has_normal = False
    absolute_floor = 0.0

    for sku in skus:
        item_data = price_db.get(sku)
        cat = str(item_data.get("Category", "")).lower()
        if "gift" not in cat:
            has_normal = True
        
        c_val = parse_idr_price(item_data.get("Clearance", 0))
        if c_val >= 1:
            absolute_floor += c_val
        else:
            w_val = parse_idr_price(item_data.get("Warning", 0))
            absolute_floor += w_val

    for sku in skus:
        item_data = price_db.get(sku)
        col_cat, col_clearance = "Category", "Clearance"
        
        category = str(item_data.get(col_cat, "")).lower()
        if "gift" in category: has_gift = True
        
        gift_factor = 0.5 if "gift" in category and sku_count > 1 and has_normal else 1.0
        
        c_val = parse_idr_price(item_data.get(col_clearance, 0))
        is_clearance_item = c_val >= 1
            
        if is_clearance_item:
            has_clearance = True
            item_prices = {k: c_val for k in PRICE_TYPES}
            item_disc = 0.0
        else:
            item_prices = {}
            item_disc = base_discount_rate
            for p_type in PRICE_TYPES:
                val = parse_idr_price(item_data.get(p_type, 0))
                if val >= 1: item_prices[p_type] = val
                else:
                    item_prices[p_type] = 0
                    is_valid[p_type] = False 

        for p_type in PRICE_TYPES:
            total_prices[p_type] += item_prices[p_type] * gift_factor * (1 - item_disc)

    final_discount_display = 0.0 if has_clearance else base_discount_rate

    result.update({
        "Bundle Discount": final_discount_display,
        "Mark Clearance": "Yes" if has_clearance else "-",
        "Mark Gift": "Yes" if has_gift else "-",
        "sku_items": sku_items
    })
    
    for p_type in PRICE_TYPES:
        if is_valid[p_type]: 
            calc_val = total_prices[p_type]
            if calc_val < absolute_floor:
                calc_val = absolute_floor
            result[p_type] = int(round(calc_val))
        else: result[p_type] = "Invalid"

    return result

def convert_df_to_excel_multisheet(df: pd.DataFrame, method: str = "Listing") -> bytes:
    import xlsxwriter
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter', engine_kwargs={'options': {'nan_inf_to_errors': True}}) as writer:
        workbook = writer.book
        
        header_fmt = workbook.add_format({'bold': True, 'bg_color': '#0c2461', 'font_color': 'white', 'border': 1, 'align': 'center', 'valign': 'vcenter', 'text_wrap': True})
        text_fmt = workbook.add_format({'num_format': '@', 'border': 1})
        num_fmt = workbook.add_format({'num_format': '0', 'border': 1}) 
        percent_fmt = workbook.add_format({'num_format': '0.0%', 'border': 1, 'align': 'center'}) 
        center_fmt = workbook.add_format({'align': 'center', 'valign': 'vcenter', 'border': 1})
        green_bg = workbook.add_format({'bg_color': '#C6EFCE', 'font_color': '#006100', 'num_format': '0'})
        red_bg = workbook.add_format({'bg_color': '#FFC7CE', 'font_color': '#9C0006', 'num_format': '0'})
        invalid_fmt = workbook.add_format({'bg_color': '#FFFFE0', 'font_color': '#b71540', 'border': 1, 'align': 'center'})
        link_fmt = workbook.add_format({'bg_color': '#e3f2fd', 'border': 1, 'num_format': '@'})

        sku_info_cols = [c for c in df.columns if re.match(r'SKU \d+ (Name|Link)', c)]
        sku_info_cols.sort(key=lambda x: (int(x.split()[1]), x.split()[2]))

        if method == "Listing":
            core_cols = ["Product ID", "PID Name", "Variation ID", "MID Name", "Campaign Price", "SKU"]
        else:
            core_cols = ["SKU", "Input Price"]
            
        metrics_cols = ["Bundle Discount", "Mark Clearance", "Mark Gift"]

        processing_sheets = [("All", PRICE_TYPES), ("Reminder", PRICE_TYPES)]
        for sc in SHEET_CONFIG:
            if sc[0] == "All": continue 
            processing_sheets.append(sc)

        for sheet_name, price_cols in processing_sheets:
            current_df = df.copy()
            
            if sheet_name == "Reminder":
                col_gap_warn = "Gap Warning"
                if col_gap_warn in current_df.columns:
                    is_under = pd.to_numeric(current_df[col_gap_warn], errors='coerce') < 0
                    is_invalid = current_df[col_gap_warn] == "Invalid"
                    current_df = current_df[is_under | is_invalid]
                else:
                    current_df = pd.DataFrame(columns=current_df.columns)

            interleaved_cols = []
            for pc in price_cols:
                interleaved_cols.append(pc)
                interleaved_cols.append(f"Gap {pc}")
            
            target_cols = core_cols + sku_info_cols + metrics_cols + interleaved_cols
            final_cols = [c for c in target_cols if c in current_df.columns]
            
            sheet_df = current_df[final_cols].fillna("").replace([np.inf, -np.inf], "")
            sheet_df.to_excel(writer, index=False, sheet_name=sheet_name)
            worksheet = writer.sheets[sheet_name]
            
            for col_num, value in enumerate(sheet_df.columns.values):
                worksheet.write(0, col_num, value, header_fmt)
            
            for row_idx, row_data in enumerate(sheet_df.values):
                for col_idx, cell_data in enumerate(row_data):
                    col_name = sheet_df.columns[col_idx]
                    if "Link" in col_name:
                         worksheet.write(row_idx + 1, col_idx, str(cell_data), link_fmt)
                    elif col_name in ["Product ID", "Variation ID", "SKU", "PID Name", "MID Name"] or "Name" in col_name:
                         worksheet.write(row_idx + 1, col_idx, str(cell_data), text_fmt)
                    elif col_name == "Bundle Discount":
                        if cell_data == "": worksheet.write(row_idx + 1, col_idx, "", center_fmt)
                        else:
                            try: worksheet.write(row_idx + 1, col_idx, float(cell_data), percent_fmt)
                            except: worksheet.write(row_idx + 1, col_idx, cell_data, center_fmt)
                    elif cell_data == "Invalid":
                        worksheet.write(row_idx + 1, col_idx, cell_data, invalid_fmt)
                    elif isinstance(cell_data, (int, float)):
                        worksheet.write(row_idx + 1, col_idx, cell_data, num_fmt)
                    else:
                        worksheet.write(row_idx + 1, col_idx, str(cell_data), center_fmt)

            worksheet.set_column('A:B', 20)
            
            for i, col_name in enumerate(final_cols):
                if col_name in PRICE_TYPES or col_name.startswith("Gap "):
                    worksheet.set_column(i, i, 16)
                elif col_name == "SKU":
                    worksheet.set_column(i, i, 35)

            for sku_col in sku_info_cols:
                if sku_col in final_cols:
                    idx = final_cols.index(sku_col)
                    worksheet.set_column(idx, idx, 4, None, {'hidden': True})
            
            current_gap_cols = [c for c in final_cols if c.startswith("Gap")]
            for col_name in current_gap_cols:
                col_idx = final_cols.index(col_name)
                col_letter = xlsxwriter.utility.xl_col_to_name(col_idx)
                last_row = len(sheet_df) + 1
                worksheet.conditional_format(f'{col_letter}2:{col_letter}{last_row}', {'type': 'text', 'criteria': 'containing', 'value': 'Invalid', 'format': invalid_fmt})
                worksheet.conditional_format(f'{col_letter}2:{col_letter}{last_row}', {'type': 'cell', 'criteria': '>=', 'value': 0, 'format': green_bg})
                worksheet.conditional_format(f'{col_letter}2:{col_letter}{last_row}', {'type': 'cell', 'criteria': '<', 'value': 0, 'format': red_bg})

    return output.getvalue()

def generate_template_file(method_type: str) -> bytes:
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        workbook = writer.book
        header_fmt = workbook.add_format({'bold': True, 'bg_color': '#D3D3D3', 'border': 1})
        
        if method_type == "Listing":
            df_check = pd.DataFrame(columns=["Product ID", "Variation ID", "Campaign Price"])
            df_check.to_excel(writer, index=False, sheet_name='Check Price')
            
            df_mass = pd.DataFrame(columns=["PID", "Listing Name", "MID", "Variations", "Parent SKU", "SKU"])
            df_mass.to_excel(writer, index=False, sheet_name='Mass Update')
            
            for sheet in ['Check Price', 'Mass Update']:
                ws = writer.sheets[sheet]
                ws.set_column('A:F', 20)
                cols = df_check.columns if sheet == 'Check Price' else df_mass.columns
                for idx, col in enumerate(cols):
                    ws.write(0, idx, col, header_fmt)
        else:
            df_sku = pd.DataFrame(columns=["SKU", "Input Price"])
            df_sku.to_excel(writer, index=False, sheet_name='Price Check')
            ws = writer.sheets['Price Check']
            ws.set_column('A:B', 25)
            for idx, col in enumerate(df_sku.columns):
                ws.write(0, idx, col, header_fmt)

    return output.getvalue()
