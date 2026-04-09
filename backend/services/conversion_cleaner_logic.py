import pandas as pd
import io
import math
import numpy as np
from typing import Tuple, Dict, Any


def extract_date_only(val) -> str:
    try:
        s = str(val).strip()
        if ' ' in s:
            return s.split(' ')[0]
        return s
    except:
        return ""


def clean_currency_int(val) -> int:
    try:
        s = str(val)
        s = s.replace('Rp', '').replace(',', '').replace('.', '').strip()
        if not s:
            return 0
        return int(round(float(s)))
    except:
        return 0


def define_channel_group(val) -> str:
    text = str(val).lower()
    if 'live' in text:
        return 'Live'
    elif 'video' in text:
        return 'Video'
    else:
        return 'Social Media'


def calculate_date_range(date_series: pd.Series) -> str:
    try:
        dt_objects = pd.to_datetime(date_series, errors='coerce').dropna()
        if dt_objects.empty:
            return "Unknown Date Range"
        start_date = dt_objects.min()
        end_date = dt_objects.max()
        duration = (end_date - start_date).days + 1
        start_str = start_date.strftime('%d %B %Y')
        end_str = end_date.strftime('%d %B %Y')
        return f"{start_str} - {end_str} ({duration} {'Day' if duration == 1 else 'Days'})"
    except:
        return "Error calculating dates"


def process_conversion_data(content: bytes, filename: str) -> Tuple[pd.DataFrame, Dict, str, Dict]:
    # Read CSV with robust encoding
    df = None
    for enc in ['utf-8', 'latin-1', 'gbk']:
        try:
            df = pd.read_csv(io.BytesIO(content), dtype=str, encoding=enc)
            break
        except:
            continue
    if df is None:
        raise ValueError("Could not read CSV file. Try re-saving as UTF-8.")

    if df.shape[1] < 34:
        raise ValueError(f"File has only {df.shape[1]} columns. Minimum 34 columns required.")

    # Column Selection by index (B=1, D=3, G=6, I=8, N=13, Q=16, V=21, W=22, Y=24, AA=26, AH=33)
    target_indices = [1, 3, 6, 8, 13, 16, 21, 22, 24, 26, 33]
    df_selected = df.iloc[:, target_indices].copy()
    df_selected.columns = [
        "Order Status", "Order Time", "Item ID", "Model ID", "Price",
        "Affiliate Username", "Purchase Value", "Refund Amount",
        "Item Brand Commission", "Commission Rate", "Original Channel"
    ]

    # Extract date & range
    date_series = df_selected["Order Time"].apply(extract_date_only)
    date_range_info = calculate_date_range(date_series)

    # Clean numeric columns (keep as int for calculations)
    calc_cols = ["Price", "Purchase Value", "Refund Amount", "Item Brand Commission"]
    for col in calc_cols:
        df_selected[col] = df_selected[col].apply(clean_currency_int)

    # Clean IDs (remove trailing .0)
    for id_col in ["Item ID", "Model ID"]:
        df_selected[id_col] = df_selected[id_col].astype(str).str.replace(r'\.0$', '', regex=True)

    # Channel group
    df_selected["Channel Group"] = df_selected["Original Channel"].apply(define_channel_group)

    # Aggregation for Top 5 summaries
    def get_top_5(dimension: str, measure: str) -> list:
        agg = df_selected.groupby(dimension)[measure].sum().sort_values(ascending=False).head(5).reset_index()
        return agg.rename(columns={dimension: 'name', measure: 'value'}).to_dict(orient='records')

    summaries = {
        "Purchase Value": {
            "top_items": get_top_5("Item ID", "Purchase Value"),
            "top_affiliates": get_top_5("Affiliate Username", "Purchase Value"),
            "top_channels": get_top_5("Original Channel", "Purchase Value"),
        },
        "Refund Amount": {
            "top_items": get_top_5("Item ID", "Refund Amount"),
            "top_affiliates": get_top_5("Affiliate Username", "Refund Amount"),
            "top_channels": get_top_5("Original Channel", "Refund Amount"),
        },
        "Item Brand Commission": {
            "top_items": get_top_5("Item ID", "Item Brand Commission"),
            "top_affiliates": get_top_5("Affiliate Username", "Item Brand Commission"),
            "top_channels": get_top_5("Original Channel", "Item Brand Commission"),
        }
    }

    # High-level stats
    stats = {
        "total_rows": len(df_selected),
        "total_purchase": int(df_selected["Purchase Value"].sum()),
        "total_refund": int(df_selected["Refund Amount"].sum()),
        "total_commission": int(df_selected["Item Brand Commission"].sum()),
        "unique_affiliates": df_selected["Affiliate Username"].nunique(),
        "date_range": date_range_info,
    }

    # Build final output dataframe
    final_df = pd.DataFrame()
    final_df["Date"] = date_series
    final_df["Order Status"] = df_selected["Order Status"]
    final_df["Item ID"] = df_selected["Item ID"]
    final_df["Model ID"] = df_selected["Model ID"]
    final_df["Price"] = df_selected["Price"].astype(str)
    final_df["Affiliate Username"] = df_selected["Affiliate Username"]
    final_df["Purchase Value"] = df_selected["Purchase Value"].astype(str)
    final_df["Refund Amount"] = df_selected["Refund Amount"].astype(str)
    final_df["Item Brand Commission"] = df_selected["Item Brand Commission"].astype(str)
    final_df["Commission Rate"] = df_selected["Commission Rate"]
    final_df["Original Channel"] = df_selected["Original Channel"]
    final_df["Channel Group"] = df_selected["Channel Group"]

    return final_df, summaries, date_range_info, stats


def export_conversion_excel(df: pd.DataFrame, summaries: Dict, date_info: str) -> bytes:
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        # Sheet 1: Cleaned Data
        df.to_excel(writer, index=False, sheet_name='Cleaned Data')
        workbook = writer.book
        ws1 = writer.sheets['Cleaned Data']

        text_fmt = workbook.add_format({'num_format': '@'})
        header_fmt_s1 = workbook.add_format({'bold': True, 'bg_color': '#4f46e5', 'font_color': 'white', 'align': 'center', 'valign': 'vcenter'})
        for col_num, col_name in enumerate(df.columns):
            ws1.write(0, col_num, col_name, header_fmt_s1)
        ws1.set_column('A:A', 12, text_fmt)
        ws1.set_column('C:D', 22, text_fmt)
        ws1.set_column('E:E', 15, text_fmt)
        ws1.set_column('G:I', 18, text_fmt)
        ws1.set_column('B:B', 16)
        ws1.set_column('F:F', 26)
        ws1.set_column('J:L', 20)

        # Sheet 2: Summary
        ws2 = workbook.add_worksheet('Summary')
        ws2.set_column('A:A', 35)
        ws2.set_column('B:D', 20)

        title_fmt = workbook.add_format({'bold': True, 'font_size': 14, 'font_color': 'white', 'bg_color': '#4f46e5', 'border': 1})
        subtitle_fmt = workbook.add_format({'bold': True, 'font_size': 11, 'font_color': '#1e293b', 'italic': True, 'bg_color': '#e2e8f0'})
        header_fmt = workbook.add_format({'bold': True, 'bg_color': '#D3D3D3', 'border': 1})
        num_fmt = workbook.add_format({'num_format': '#,##0', 'border': 1})
        border_fmt = workbook.add_format({'border': 1})

        row_cursor = 0
        ws2.merge_range(f'A1:C1', f"Data Period: {date_info}", title_fmt)
        row_cursor += 2

        metric_label_map = {
            "Purchase Value": {"top_items": "Top 5 Items", "top_affiliates": "Top 5 Affiliates", "top_channels": "Top 5 Channels"},
            "Refund Amount": {"top_items": "Top 5 Items", "top_affiliates": "Top 5 Affiliates", "top_channels": "Top 5 Channels"},
            "Item Brand Commission": {"top_items": "Top 5 Items", "top_affiliates": "Top 5 Affiliates", "top_channels": "Top 5 Channels"},
        }

        for metric_name, tables in summaries.items():
            ws2.merge_range(row_cursor, 0, row_cursor, 1, metric_name.upper(), title_fmt)
            row_cursor += 2
            for sub_key, rows in tables.items():
                label = metric_label_map[metric_name][sub_key]
                ws2.write(row_cursor, 0, label, subtitle_fmt)
                row_cursor += 1
                ws2.write(row_cursor, 0, "Name", header_fmt)
                ws2.write(row_cursor, 1, metric_name, header_fmt)
                for data_row in rows:
                    row_cursor += 1
                    ws2.write(row_cursor, 0, str(data_row['name']), border_fmt)
                    ws2.write(row_cursor, 1, data_row['value'], num_fmt)
                row_cursor += 2
            row_cursor += 1

    return output.getvalue()
