import pandas as pd
import io
import xlsxwriter
from typing import Tuple, Dict

def process_erp_oos(file_a_bytes: bytes, file_a_name: str, file_b_bytes: bytes, file_b_name: str) -> Tuple[Dict, bytes]:
    def load_data(b_data: bytes, fname: str) -> pd.DataFrame:
        if fname.endswith('.csv'):
            return pd.read_csv(io.BytesIO(b_data))
        else:
            return pd.read_excel(io.BytesIO(b_data))

    df_a = load_data(file_a_bytes, file_a_name)
    df_b = load_data(file_b_bytes, file_b_name)

    if df_a.shape[1] < 81:
         raise ValueError(f"Data A (Orders) must have at least 81 columns. Found {df_a.shape[1]}.")
    if df_b.shape[1] < 5:
         raise ValueError(f"Data B (Inventory) must have at least 5 columns. Found {df_b.shape[1]}.")

    col_x_idx = 23
    mask_exclude = df_a.iloc[:, col_x_idx].astype(str).str.contains('PreSale|OnlineShip', case=False, na=False)
    df_a_clean = df_a[~mask_exclude]

    zero_stock_df = df_b[df_b.iloc[:, 4] == 0]
    zero_stock_skus = zero_stock_df.iloc[:, 1].astype(str).unique().tolist()

    final_result = df_a_clean[df_a_clean.iloc[:, 42].astype(str).isin(zero_stock_skus)]

    target_indices = [0, 1, 2, 10, 11, 13, 23, 25, 42, 78, 79, 80]
    output_df = final_result.iloc[:, target_indices]

    summary = {
        "total_initial": len(df_a),
        "zero_stock_skus": len(zero_stock_skus),
        "final_matches": len(output_df)
    }

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        output_df.to_excel(writer, index=False, sheet_name='Result')

    return summary, output.getvalue()
