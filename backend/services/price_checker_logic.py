import pandas as pd
import numpy as np
import io
import re
import gspread
from typing import Tuple, Dict, Any, List

SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1GoIpse2K5piWfw5J1urkoZj6KWY3zBo8UX0TAmvUZ1M"
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

def load_product_database() -> Tuple[Dict, Dict, Dict]:
    try:
        gc = gspread.service_account(filename=CREDENTIALS_FILE)
        sh = gc.open_by_url(SPREADSHEET_URL)
        
        # Read Price sheet
        price_worksheet = sh.worksheet("Price")
        price_data = price_worksheet.get_all_values()
        if not price_data:
            return {}, {}, {}
            
        df_price = pd.DataFrame(price_data[1:], columns=price_data[0])
        df_price.iloc[:, 0] = df_price.iloc[:, 0].astype(str).str.strip()
        price_db = df_price.set_index(df_price.columns[0]).to_dict('index')

        # Read All_Name sheet
        try:
            name_worksheet = sh.worksheet("All_Name")
            name_data = name_worksheet.get_all_values()
            df_names = pd.DataFrame(name_data[1:], columns=name_data[0])
            df_names.iloc[:, 0] = df_names.iloc[:, 0].astype(str).str.strip()
            name_map = df_names.set_index(df_names.columns[0])[df_names.columns[1]].to_dict()
            if df_names.shape[1] > 2:
                link_map = df_names.set_index(df_names.columns[0])[df_names.columns[2]].to_dict()
            else:
                link_map = {}
        except Exception:
            name_map = {}
            link_map = {}

        return price_db, name_map, link_map
    except Exception as e:
        print(f"Error fetching gspread: {e}")
        return {}, {}, {}

def clean_sku_list(sku_string: str) -> List[str]:
    if pd.isna(sku_string) or not sku_string: return []
    parts = re.split(r'[+\-,|]+', str(sku_string))
    return [p.strip() for p in parts if p.strip()]

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

    for sku in skus:
        item_data = price_db.get(sku, {})
        name = name_map.get(sku, "-")
        cat = str(item_data.get("Category", "")).lower()
        is_gift = "gift" in cat
        gift_factor = 0.5 if is_gift and sku_count > 1 else 1.0

        c_val = item_data.get("Clearance", 0)
        is_clearance = False
        try:
            if float(str(c_val).replace(',', '')) >= 1: is_clearance = True
        except: pass

        base_price = item_data.get("Warning", 0) 

        if is_clearance:
            final_price = float(c_val)
            logic_applied = "Clearance Override"
        else:
            try: base_price_float = float(str(base_price).replace(',', ''))
            except: base_price_float = 0.0

            final_price = base_price_float * gift_factor * (1 - base_disc)
            logic_list = []
            if is_gift and sku_count > 1: logic_list.append("Gift (50%)")
            if base_disc > 0: logic_list.append(f"Bundle Disc ({base_disc*100}%)")
            logic_applied = " + ".join(logic_list) if logic_list else "Normal Price"

        breakdown_data.append({
            "SKU": sku,
            "Product Name": name,
            "Base Price (Warning)": base_price,
            "Logic Applied": logic_applied,
            "Total Contribution (IDR)": int(round(final_price))
        })

    return breakdown_data

def calculate_prices(sku_string: str, price_db: Dict, name_map: Dict, link_map: Dict) -> Dict:
    skus = clean_sku_list(sku_string)
    sku_count = len(skus)
    result = {}
    
    for i, sku in enumerate(skus):
        idx = i + 1
        sku_name = name_map.get(sku, "-")
        sku_link = link_map.get(sku, "-")
        result[f"SKU {idx} Name"] = sku_name
        result[f"SKU {idx} Link"] = sku_link

    if sku_count == 0:
        result.update({
            "Bundle Discount": 0, "Mark Clearance": "-", "Mark Gift": "-",
            **{k: "Invalid" for k in PRICE_TYPES}
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

    for sku in skus:
        item_data = price_db.get(sku)
        col_cat, col_clearance = "Category", "Clearance"
        
        category = str(item_data.get(col_cat, "")).lower()
        if "gift" in category: has_gift = True
        
        gift_factor = 0.5 if "gift" in category and sku_count > 1 else 1.0
        clearance_price = item_data.get(col_clearance)
        is_clearance_item = False
        try:
            c_val = float(str(clearance_price).replace(',', ''))
            if c_val >= 1: is_clearance_item = True
        except: pass
            
        if is_clearance_item:
            has_clearance = True
            item_prices = {k: c_val for k in PRICE_TYPES}
            item_disc = 0.0
        else:
            item_prices = {}
            item_disc = base_discount_rate
            for p_type in PRICE_TYPES:
                try:
                    val_str = str(item_data.get(p_type, 0)).replace(',', '')
                    val = float(val_str)
                    if val >= 1: item_prices[p_type] = val
                    else:
                        item_prices[p_type] = 0
                        is_valid[p_type] = False 
                except:
                    item_prices[p_type] = 0
                    is_valid[p_type] = False

        for p_type in PRICE_TYPES:
            total_prices[p_type] += item_prices[p_type] * gift_factor * (1 - item_disc)

    final_discount_display = 0.0 if has_clearance else base_discount_rate

    result.update({
        "Bundle Discount": final_discount_display,
        "Mark Clearance": "Yes" if has_clearance else "-",
        "Mark Gift": "Yes" if has_gift else "-"
    })
    
    for p_type in PRICE_TYPES:
        if is_valid[p_type]: result[p_type] = int(round(total_prices[p_type]))
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
