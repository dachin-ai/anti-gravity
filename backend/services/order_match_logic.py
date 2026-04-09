import pandas as pd
import io
import math
from typing import Tuple, Dict, Optional


def find_column(df: pd.DataFrame, target_name: str) -> Optional[str]:
    """Find actual column name case-insensitively."""
    cols = df.columns.str.strip().str.lower()
    target = target_name.strip().lower()
    matches = df.columns[cols == target]
    return matches[0] if len(matches) > 0 else None


def process_order_matching(df_raw: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, Dict]:
    # Flexible column mapper
    col_order = find_column(df_raw, 'original order number')
    col_online_code = find_column(df_raw, 'online product code')
    col_sku_id = find_column(df_raw, 'online product sku id')
    col_sys_code = find_column(df_raw, 'system product code')

    missing_cols = []
    if not col_order: missing_cols.append("Original Order Number")
    if not col_online_code: missing_cols.append("Online Product Code")
    if not col_sku_id: missing_cols.append("Online Product SKU ID")
    if not col_sys_code: missing_cols.append("System Product Code")

    if missing_cols:
        raise ValueError(f"Required columns not found: {', '.join(missing_cols)}. Check file header names.")

    df = df_raw.copy()

    # Basic cleaning
    df[col_online_code] = df[col_online_code].fillna('').astype(str)
    df[col_sys_code] = df[col_sys_code].fillna('').astype(str)

    df['Product Match'] = 'Not Match'
    df['Reason'] = '-'

    grouped = df.groupby([col_order, col_sku_id])

    for (order, sku), group in grouped:
        raw_online_code = group[col_online_code].iloc[0]

        expected_codes = [x.strip() for x in raw_online_code.split('+') if x.strip()]
        actual_codes = [x.strip() for x in group[col_sys_code].tolist() if x.strip()]

        actual_temp = actual_codes.copy()
        missing_list = []

        for code in expected_codes:
            if code in actual_temp:
                actual_temp.remove(code)
            else:
                missing_list.append(code)

        wrong_list = actual_temp

        reasons = []
        if wrong_list:
            reasons.append(f"{', '.join(wrong_list)} Wrong")
        if missing_list:
            reasons.append(f"{', '.join(missing_list)} Missing")

        if not reasons:
            df.loc[group.index, 'Product Match'] = 'Match'
            df.loc[group.index, 'Reason'] = 'OK'
        else:
            df.loc[group.index, 'Product Match'] = 'Not Match'
            df.loc[group.index, 'Reason'] = ' | '.join(reasons)

    # Metrics
    total_unique_orders = int(df[col_order].nunique())
    unmatched_orders_list = df[df['Product Match'] == 'Not Match'][col_order].unique()
    total_unmatched = int(len(unmatched_orders_list))
    total_matched = total_unique_orders - total_unmatched
    accuracy = round((total_matched / total_unique_orders * 100), 2) if total_unique_orders > 0 else 0

    metrics = {
        'total_orders': total_unique_orders,
        'matched_orders': total_matched,
        'unmatched_orders': total_unmatched,
        'accuracy': accuracy,
    }

    # Sheet 2: unmatched orders with SKU split
    sheet2_cols = [col_order, col_online_code, col_sku_id, col_sys_code, 'Product Match', 'Reason']
    sheet2_df = df[df[col_order].isin(unmatched_orders_list)][sheet2_cols].copy()

    sku_split = sheet2_df[col_sku_id].astype(str).str.split('-', n=1, expand=True)
    sheet2_df['Product ID'] = sku_split[0]
    sheet2_df['Variation ID'] = sku_split[1] if 1 in sku_split.columns else ''

    final_sheet2_cols = [col_order, col_online_code, col_sku_id, 'Product ID', 'Variation ID', col_sys_code, 'Product Match', 'Reason']
    sheet2_df = sheet2_df[final_sheet2_cols]

    # Stringify and reset index
    df = df.fillna("").astype(str).reset_index(drop=True)
    sheet2_df = sheet2_df.fillna("").astype(str).reset_index(drop=True)

    return df, sheet2_df, metrics


def export_order_match_excel(df_sheet1: pd.DataFrame, df_sheet2: pd.DataFrame) -> bytes:
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df_sheet1.to_excel(writer, sheet_name='Data Detail', index=False)
        df_sheet2.to_excel(writer, sheet_name='Unmatched Orders', index=False)

        workbook = writer.book
        header_fmt = workbook.add_format({'bold': True, 'bg_color': '#4f46e5', 'font_color': 'white', 'align': 'center'})
        format_match = workbook.add_format({'bg_color': '#c8e6c9', 'font_color': '#1b5e20', 'font_size': 10})
        format_not_match = workbook.add_format({'bg_color': '#ffcdd2', 'font_color': '#b71c1c', 'font_size': 10})

        def write_sheet(ws, df_in):
            for col_num, col_name in enumerate(df_in.columns):
                ws.write(0, col_num, col_name, header_fmt)
                ws.set_column(col_num, col_num, max(len(col_name) + 4, 18))
            if 'Product Match' in df_in.columns:
                match_col = df_in.columns.get_loc('Product Match')
                ws.conditional_format(1, match_col, len(df_in), match_col, {
                    'type': 'cell', 'criteria': '==', 'value': '"Match"', 'format': format_match
                })
                ws.conditional_format(1, match_col, len(df_in), match_col, {
                    'type': 'cell', 'criteria': '==', 'value': '"Not Match"', 'format': format_not_match
                })

        write_sheet(writer.sheets['Data Detail'], df_sheet1)
        if not df_sheet2.empty:
            write_sheet(writer.sheets['Unmatched Orders'], df_sheet2)

    return output.getvalue()
