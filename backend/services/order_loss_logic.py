import pandas as pd
import numpy as np
import io
import re
import xlsxwriter
from typing import Dict, Any, Tuple
import math
import traceback
from .price_checker_logic import get_bundle_discount_rate

def detect_type(order_number):
    if pd.isna(order_number): return "Sales | 销售"
    if str(order_number).strip().endswith('-1'): return "After Sales | 售后"
    return "Sales | 销售"

def clean_currency_strict(x):
    if pd.isna(x) or str(x).strip() == '': return 0
    s = str(x).strip().upper()
    s = re.sub(r'[^\d\.\,\-]', '', s)
    if '.' in s: s = s.split('.')[0]
    if ',' in s: s = s.split(',')[0]
    try:
        if not s or s == '-': return 0
        return int(s)
    except ValueError:
        return 0

def clean_sku_list(sku_string):
    if pd.isna(sku_string): return []
    parts = re.split(r'[+\-,|]+', str(sku_string))
    return [p.strip() for p in parts if p.strip()]

def get_order_brand_details(sys_codes_list, online_skus_list, price_db, price_type):
    if not price_db: return [0, "-", "-"]
    
    total_brand_price = 0.0
    has_gift = False
    has_clearance = False
    
    for sys_code, online_sku in zip(sys_codes_list, online_skus_list):
        sys_str = str(sys_code).strip() if pd.notna(sys_code) else ""
        
        if pd.isna(online_sku) or str(online_sku).strip().lower() == 'nan':
            online_str = ""
        else:
            online_str = str(online_sku).strip()
        
        is_bundle = len(online_str) > 15
        
        if is_bundle:
            skus = clean_sku_list(sys_str)
            sku_count = len(skus)
            if sku_count == 0: continue
            
            disc_rate = get_bundle_discount_rate(sku_count)
            
            for sku in skus:
                item_data = price_db.get(sku)
                if not item_data: return [0, "-", "-"] 
                
                category = str(item_data.get('Category', '')).lower()
                is_gift = "gift" in category
                if is_gift: has_gift = True
                gift_factor = 0.5 if (is_gift and sku_count > 1) else 1.0
                
                clearance_val = item_data.get('Clearance')
                try:
                    c_val = float(str(clearance_val).replace(',', ''))
                    is_clr = c_val >= 1
                except:
                    is_clr = False
                    
                if is_clr:
                    has_clearance = True
                    item_price = c_val
                    item_disc = 0.0
                else:
                    try: item_price = float(str(item_data.get(price_type, 0)).replace(',', ''))
                    except: item_price = 0
                    item_disc = disc_rate
                    
                total_brand_price += item_price * gift_factor * (1 - item_disc)
        else:
            sku = sys_str
            if not sku: continue
            item_data = price_db.get(sku)
            if not item_data: return [0, "-", "-"] 
            
            clearance_val = item_data.get('Clearance')
            try:
                c_val = float(str(clearance_val).replace(',', ''))
                is_clr = c_val >= 1
            except:
                is_clr = False
                
            if is_clr:
                has_clearance = True
                item_price = c_val
            else:
                try: item_price = float(str(item_data.get(price_type, 0)).replace(',', ''))
                except: item_price = 0
            
            total_brand_price += item_price
            
    mark_gift = "Yes" if has_gift else "-"
    mark_clearance = "Yes" if has_clearance else "-"
    
    return [int(round(total_brand_price)), mark_gift, mark_clearance]

def evaluate_second_judge(setting_price, brand_price, pct_voucher):
    if pct_voucher > 0.03:
        return "Need Review | 需要审查"
    else:
        if setting_price < brand_price:
            return "Need Review | 需要审查"
        else:
            return "Safe | 安全"

def get_diagnostic_reason(row):
    reasons = []
    if "Need Review" in str(row.get('First Judge | 第一判断', '')):
        reasons.append("Profit Issue")
        
    if "Need Review" in str(row.get('Second Judge | 第二判断', '')):
        if row.get('Gap | 差价', 0) < 0:
            reasons.append("Setting Price Issue")
        if row.get('% Voucher | 优惠券比例', 0) > 0.03:
            reasons.append("Voucher Issue")
            
    if not reasons:
        return "Safe"
    return ", ".join(reasons)

def process_data_grouped(df, group_col, order_metrics=None):
    temp = df.copy()
    
    temp['Loss_Val'] = temp['Product Detail Gross Profit'].apply(lambda x: x if x < 0 else 0)
    temp['Profit_Val'] = temp['Product Detail Gross Profit'].apply(lambda x: x if x >= 0 else 0)
    
    grouped = temp.groupby(group_col).agg({
        'Loss_Val': 'sum',
        'Profit_Val': 'sum',
        'Product Detail Gross Profit': 'sum',
        'Type': 'first'
    }).reset_index()
    
    sales_loss_list, aftersales_loss_list = [], []
    for idx, row in grouped.iterrows():
        group_val = row[group_col]
        sales_loss = temp[(temp[group_col] == group_val) & (temp['Type'] == 'Sales | 销售') & (temp['Loss_Val'] < 0)]['Loss_Val'].sum()
        aftersales_loss = temp[(temp[group_col] == group_val) & (temp['Type'] == 'After Sales | 售后') & (temp['Loss_Val'] < 0)]['Loss_Val'].sum()
        sales_loss_list.append(sales_loss)
        aftersales_loss_list.append(aftersales_loss)
    
    grouped['Sales Loss | 销售损失'] = sales_loss_list
    grouped['After Sales Loss | 售后损失'] = aftersales_loss_list
    
    grouped.columns = [group_col, 'Loss_Val', 'Profit | 利润', 'Total Net', 'Type', 'Sales Loss | 销售损失', 'After Sales Loss | 售后损失']
    grouped['Total Loss | 总损失'] = grouped['Sales Loss | 销售损失'] + grouped['After Sales Loss | 售后损失']
    grouped['Total Profit | 总利润'] = grouped['Profit | 利润']
    grouped['Final Profit | 最终利润'] = grouped['Total Net']
    grouped['First Judge | 第一判断'] = grouped['Final Profit | 最终利润'].apply(
        lambda x: "Need Review | 需要审查" if x <= 0 else "Safe | 安全"
    )
    
    grouped = grouped.sort_values(by='Total Loss | 总损失', ascending=True)
    
    final_cols = [group_col, 'Sales Loss | 销售损失', 'After Sales Loss | 售后损失', 
                  'Total Loss | 总损失', 'Total Profit | 总利润', 'Final Profit | 最终利润', 'First Judge | 第一判断']
    grouped = grouped[final_cols]
    
    if group_col == 'Original Order Number' and order_metrics is not None:
        metrics_cols = ['Original Order Number', 'Setting Price | 设定价格', 'Brand Price | 品牌价格', 
                        'Gap | 差价', 'Voucher | 优惠券', '% Voucher | 优惠券比例', 'Second Judge | 第二判断',
                        'Mark Gift | 赠品', 'Mark Clearance | 清仓', 'Whole SKU | 完整SKU', 'Store | 店铺']
        grouped = pd.merge(grouped, order_metrics[metrics_cols], on='Original Order Number', how='left')
        
    return grouped

def generate_excel(dfs: Dict[str, pd.DataFrame]) -> bytes:
    output = io.BytesIO()
    writer = pd.ExcelWriter(output, engine='xlsxwriter')
    workbook = writer.book
    
    fmt_num = workbook.add_format({'num_format': '#,##0'})
    fmt_pct = workbook.add_format({'num_format': '0.00%'})
    fmt_head = workbook.add_format({'bold': True, 'bg_color': '#4f46e5', 'font_color': 'white', 'border': 1, 'align': 'center', 'valign': 'vcenter'})
    fmt_sales_loss = workbook.add_format({'bg_color': '#fff3e0', 'font_color': '#e65100', 'num_format': '#,##0'})
    fmt_aftersales_loss = workbook.add_format({'bg_color': '#fce4ec', 'font_color': '#880e4f', 'num_format': '#,##0'})
    fmt_green = workbook.add_format({'bg_color': '#f1f8f4', 'font_color': '#1b5e20', 'num_format': '#,##0'})
    fmt_gap_pos = workbook.add_format({'bg_color': '#e8f5e9', 'font_color': '#1b5e20', 'num_format': '#,##0'})
    fmt_gap_neg = workbook.add_format({'bg_color': '#ffebee', 'font_color': '#b71c1c', 'num_format': '#,##0'})
    
    for sheet, data in dfs.items():
        data.to_excel(writer, sheet_name=sheet, index=False)
        ws = writer.sheets[sheet]
        (max_r, max_c) = data.shape
        
        for col, val in enumerate(data.columns):
            ws.write(0, col, val, fmt_head)
            if 'Whole SKU' in val or 'Reason' in val or 'Store' in val:
                ws.set_column(col, col, 35)
            else:
                ws.set_column(col, col, 20)
            
        for col, name in enumerate(data.columns):
            rng = f"{xlsxwriter.utility.xl_col_to_name(col)}2:{xlsxwriter.utility.xl_col_to_name(col)}{max_r+1}"
            
            if '% Voucher' in name:
                ws.set_column(col, col, 16, fmt_pct)
            elif 'Gap' in name:
                ws.set_column(col, col, 16, fmt_num)
                ws.conditional_format(rng, {'type': 'cell', 'criteria': '<', 'value': 0, 'format': fmt_gap_neg})
                ws.conditional_format(rng, {'type': 'cell', 'criteria': '>=', 'value': 0, 'format': fmt_gap_pos})
            elif any(x in name for x in ['Loss', 'Profit', 'Price', 'Voucher']):
                ws.set_column(col, col, 16, fmt_num)
                if sheet != "Raw Data Filtered":
                    if 'Sales Loss' in name: ws.conditional_format(rng, {'type': 'cell', 'criteria': '<', 'value': 0, 'format': fmt_sales_loss})
                    elif 'After Sales Loss' in name: ws.conditional_format(rng, {'type': 'cell', 'criteria': '<', 'value': 0, 'format': fmt_aftersales_loss})
                    elif 'Profit' in name: ws.conditional_format(rng, {'type': 'cell', 'criteria': '>=', 'value': 0, 'format': fmt_green})
                    
    writer.close()
    return output.getvalue()

def sanitize_json(val):
    if pd.isna(val) or (isinstance(val, float) and math.isnan(val)):
        return 0
    return val

def run_order_loss_audit(df: pd.DataFrame, price_db: Dict, price_type: str = "Warning") -> Tuple[Dict, bytes]:
    df.columns = df.columns.str.strip()
    
    col_mapping = {
        '原始单号': 'Original Order Number',
        'ERP单号': 'ERP Order Number',
        '店铺': 'Store',
        '线上商品编码': 'Online Product Code', 
        '线上商品SKUid': 'Online Product SKU ID',
        '系统商品编码': 'System Product Code',
        '商品明细毛利': 'Product Detail Gross Profit',
        '商品明细优惠后金额': 'Product Detail Amount After Discount',
        '商品实付金额': 'Product Detail Amount After Discount',
        '商品折后明细金额': 'Product Detail Amount After Discount',
        '卖家优惠券': 'Seller Coupon'
    }
    df = df.rename(columns=col_mapping)
    
    req_cols = ['Store', 'Original Order Number', 'ERP Order Number', 'Online Product Code', 'System Product Code', 
                'Product Detail Gross Profit', 'Product Detail Amount After Discount', 'Seller Coupon']
    
    missing = [c for c in req_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {', '.join(missing)}")
    
    df['Type'] = df['Original Order Number'].apply(detect_type)
    df['Product Detail Gross Profit'] = df['Product Detail Gross Profit'].apply(clean_currency_strict)
    df['Product Detail Amount After Discount'] = df['Product Detail Amount After Discount'].apply(clean_currency_strict)
    df['Seller Coupon'] = df['Seller Coupon'].apply(clean_currency_strict)
    
    has_allocated_amount = 'Order allocated amount' in df.columns
    if has_allocated_amount:
        df['Order allocated amount'] = df['Order allocated amount'].apply(clean_currency_strict)
    
    # ---------------------------------------------------------
    zero_amount_flag = df.groupby('Original Order Number')['Product Detail Amount After Discount'].apply(
        lambda x: (x.fillna(0) == 0).any()
    ).reset_index(name='Has_Zero_Amount')
    
    agg_rules = {
        'Product Detail Amount After Discount': 'sum',
        'Seller Coupon': 'first', 
        'Store': 'first', 
        'System Product Code': lambda x: list(x),
        'Online Product Code': lambda x: list(x) 
    }
    
    if has_allocated_amount:
        agg_rules['Order allocated amount'] = 'first'
        
    order_metrics = df.groupby('Original Order Number').agg(agg_rules).reset_index()
    order_metrics = order_metrics.merge(zero_amount_flag, on='Original Order Number', how='left')
    order_metrics = order_metrics.rename(columns={'Store': 'Store | 店铺'})
    
    if has_allocated_amount:
        order_metrics['Setting Price | 设定价格'] = order_metrics['Order allocated amount']
    else:
        order_metrics['Setting Price | 设定价格'] = order_metrics.apply(
            lambda row: row['Seller Coupon'] * 10 if row['Has_Zero_Amount'] else (row['Product Detail Amount After Discount'] + row['Seller Coupon']),
            axis=1
        )
    
    # Batch apply brand details
    brand_details = order_metrics.apply(
        lambda row: get_order_brand_details(row['System Product Code'], row['Online Product Code'], price_db, price_type),
        axis=1, result_type='expand'
    )
    order_metrics[['Brand Price | 品牌价格', 'Mark Gift | 赠品', 'Mark Clearance | 清仓']] = brand_details
    
    order_metrics['Whole SKU | 完整SKU'] = order_metrics['System Product Code'].apply(
        lambda codes: " + ".join([p.strip() for code in codes if pd.notna(code) for p in re.split(r'[+\-,|]+', str(code)) if p.strip()])
    )
    
    order_metrics['Gap | 差价'] = order_metrics['Setting Price | 设定价格'] - order_metrics['Brand Price | 品牌价格']
    order_metrics['Voucher | 优惠券'] = order_metrics['Seller Coupon']
    
    order_metrics['% Voucher | 优惠券比例'] = order_metrics.apply(
        lambda x: (x['Voucher | 优惠券'] / x['Setting Price | 设定价格']) if x['Setting Price | 设定价格'] != 0 else 0, 
        axis=1
    )
    
    order_metrics['Second Judge | 第二判断'] = order_metrics.apply(
        lambda x: evaluate_second_judge(x['Setting Price | 设定价格'], x['Brand Price | 品牌价格'], x['% Voucher | 优惠券比例']), 
        axis=1
    )
    
    sheet1 = df[req_cols + (['Order allocated amount'] if has_allocated_amount else []) + ['Type']].copy()
    sheet2 = process_data_grouped(df, 'Original Order Number', order_metrics)
    
    sheet2['Reason | 原因'] = sheet2.apply(get_diagnostic_reason, axis=1)
    
    cols = sheet2.columns.tolist()
    if 'Store | 店铺' in cols:
        cols.insert(1, cols.pop(cols.index('Store | 店铺')))
    if 'Reason | 原因' in cols:
        cols.append(cols.pop(cols.index('Reason | 原因')))
    sheet2 = sheet2[cols]
    
    sheet3 = process_data_grouped(df, 'System Product Code') 
    sheet4 = process_data_grouped(df, 'Store | 店铺' if 'Store | 店铺' in df.columns else 'Store') 
    
    # Calculate Summaries
    total_sales_loss = sheet2['Sales Loss | 销售损失'].sum()
    total_aftersales_loss = sheet2['After Sales Loss | 售后损失'].sum()
    total_profit = sheet2['Total Profit | 总利润'].sum()
    final_profit = sheet2['Final Profit | 最终利润'].sum()
    
    safe_count = len(sheet2[sheet2['Reason | 原因'] == 'Safe'])
    review_count = len(sheet2[sheet2['Reason | 原因'] != 'Safe'])
    
    summary = {
        "total_orders": len(sheet2),
        "total_transactions": len(df),
        "safe_orders": safe_count,
        "review_orders": review_count,
        "sales_loss": sanitize_json(total_sales_loss),
        "aftersales_loss": sanitize_json(total_aftersales_loss),
        "total_profit": sanitize_json(total_profit),
        "final_profit": sanitize_json(final_profit)
    }

    # Generate Bytes
    excel_bytes = generate_excel({
        "Raw Data Filtered": sheet1, 
        "By Order": sheet2, 
        "By Product": sheet3, 
        "By Store": sheet4
    })
    
    return summary, excel_bytes
