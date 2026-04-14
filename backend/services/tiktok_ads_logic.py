import io
import re
import base64
import math
from datetime import datetime
from typing import Any, Dict, List, Tuple

import pandas as pd
import numpy as np

# ==========================================
# HELPERS
# ==========================================
def clean_numeric(val) -> float:
    """Safely convert any value to float. Returns 0.0 on failure."""
    try:
        if val is None:
            return 0.0
        if isinstance(val, (int, float)):
            if pd.isna(val):
                return 0.0
            return float(val)
        val_str = str(val).replace(",", "").strip()
        if val_str == "" or val_str.lower() == "nan":
            return 0.0
        return float(val_str)
    except Exception:
        return 0.0


def calculate_metrics_vectorized(df: pd.DataFrame, group_cols: List[str]) -> pd.DataFrame:
    """Calculate all KPI metrics for a group. Fast vectorized implementation."""
    if df.empty:
        return pd.DataFrame(columns=group_cols + [
            "Gross Revenue", "Cost", "SKU Orders", "CPO", "ROAS", "ROI", "Impressions", "Clicks"
        ])

    agg_df = df.groupby(group_cols, as_index=False).agg({
        "Cost": "sum",
        "Gross revenue": "sum",
        "SKU orders": "sum",
        "Product ad impressions": "sum",
        "Product ad clicks": "sum"
    })

    # Calculations exactly matching user's calculate_metrics
    cost = np.ceil(agg_df["Cost"])
    revenue = np.ceil(agg_df["Gross revenue"])
    sku_orders = agg_df["SKU orders"]

    agg_df["Cost"] = cost.astype(int)
    agg_df["Gross Revenue"] = revenue.astype(int)
    agg_df["SKU Orders"] = sku_orders.astype(int)
    agg_df["Impressions"] = agg_df["Product ad impressions"].astype(int)
    agg_df["Clicks"] = agg_df["Product ad clicks"].astype(int)

    cpo = np.where(sku_orders > 0, cost / sku_orders, 0.0)
    roas = np.where(cost > 0, revenue / cost, 0.0)
    roi = np.where(cost > 0, (revenue - cost) / cost, 0.0)

    agg_df["CPO"] = np.round(cpo, 2)
    agg_df["ROAS"] = np.round(roas, 2)
    agg_df["ROI"] = np.round(roi, 2)

    desired_cols = group_cols + [
        "Gross Revenue", "Cost", "SKU Orders", "CPO", "ROAS", "ROI", "Impressions", "Clicks"
    ]
    return agg_df[desired_cols]


def read_and_transform_single_file(file_bytes: bytes, filename: str) -> pd.DataFrame:
    if filename.endswith(".csv"):
        raw_df = pd.read_csv(io.BytesIO(file_bytes), dtype=str)
    else:
        raw_df = pd.read_excel(io.BytesIO(file_bytes), dtype=str)

    # Drop completely empty rows
    raw_df = raw_df.dropna(how="all").reset_index(drop=True)

    target_indices = [2, 3, 5, 6, 7, 8, 10, 11, 13, 15, 16]
    expected_cols = [
        "Product ID", "Creative type", "Video ID", "TikTok account",
        "Time posted", "Status", "Cost", "SKU orders", "Gross revenue",
        "Product ad impressions", "Product ad clicks"
    ]

    if raw_df.shape[1] <= max(target_indices):
        raise ValueError(
            f"Column mapping failed for {filename}. "
            "Expected at least 17 columns."
        )

    df = raw_df.iloc[:, target_indices].copy()
    df.columns = expected_cols

    df["Product ID"] = df["Product ID"].fillna("-").astype(str).str.replace(r"\.0$", "", regex=True)
    df["Video ID"] = df["Video ID"].fillna("-").astype(str).str.replace(r"\.0$", "", regex=True)
    df["TikTok account"] = df["TikTok account"].fillna("-").astype(str)
    df["Creative type"] = df["Creative type"].fillna("Unknown").astype(str).str.strip()
    df["Status"] = df["Status"].fillna("Unknown").astype(str).str.strip()
    df["Time posted"] = pd.to_datetime(df["Time posted"], errors="coerce")

    numeric_cols = ["Cost", "SKU orders", "Gross revenue", "Product ad impressions", "Product ad clicks"]
    for col in numeric_cols:
        df[col] = df[col].apply(clean_numeric)

    df["Source File"] = filename
    return df


def build_summary_sheet(df: pd.DataFrame) -> pd.DataFrame:
    base_metrics = ["Gross Revenue", "Cost", "SKU Orders", "CPO", "ROAS", "ROI", "Impressions", "Clicks"]

    grouped = calculate_metrics_vectorized(df, ["Product ID", "Creative type"])
    
    if grouped.empty:
        return pd.DataFrame()

    pivot_df = grouped.pivot(index="Product ID", columns="Creative type").fillna(0)
    # Simplify multi-index created by pivot manually
    pivot_cols = []
    for col in pivot_df.columns:
        metric, ctype = col[0], col[1]
        pivot_cols.append(f"[{ctype}] {metric}" if ctype else metric)
    pivot_df.columns = pivot_cols

    overall = calculate_metrics_vectorized(df, ["Product ID"]).set_index("Product ID")
    overall.columns = [f"[Overall] {c}" for c in overall.columns]

    summary = pivot_df.join(overall).reset_index()

    for ct in ["Product card", "Video"]:
        for m in base_metrics:
            col_name = f"[{ct}] {m}"
            if col_name not in summary.columns:
                summary[col_name] = 0.0

    ordered_cols = (
        ["Product ID"] +
        [f"[Product card] {m}" for m in base_metrics] +
        [f"[Video] {m}" for m in base_metrics] +
        [f"[Overall] {m}" for m in base_metrics]
    )
    summary = summary[[c for c in ordered_cols if c in summary.columns]]
    metric_cols = [c for c in summary.columns if c != "Product ID"]
    summary = summary.loc[(summary[metric_cols] != 0).any(axis=1)].copy()
    
    return summary


def build_top10_sheet(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    df = df.copy()
    df["Creative type norm"] = df["Creative type"].astype(str).str.strip().str.lower()

    card_df = df[df["Creative type norm"] == "product card"]
    video_df = df[df["Creative type norm"] == "video"]

    if not card_df.empty:
        top_card = calculate_metrics_vectorized(card_df, ["Product ID"]).sort_values("Gross Revenue", ascending=False).head(10).reset_index(drop=True)
    else:
        top_card = pd.DataFrame(columns=["Product ID", "Gross Revenue", "Cost", "SKU Orders", "CPO", "ROAS", "ROI", "Impressions", "Clicks"])

    if not video_df.empty:
        top_video = calculate_metrics_vectorized(video_df, ["Product ID"]).sort_values("Gross Revenue", ascending=False).head(10).reset_index(drop=True)
    else:
        top_video = pd.DataFrame(columns=["Product ID", "Gross Revenue", "Cost", "SKU Orders", "CPO", "ROAS", "ROI", "Impressions", "Clicks"])

    top_overall = calculate_metrics_vectorized(df, ["Product ID"]).sort_values("Gross Revenue", ascending=False).head(10).reset_index(drop=True)

    return top_card, top_video, top_overall


def build_zero_revenue_sheets(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
    df = df.copy()
    df["Creative type norm"] = df["Creative type"].astype(str).str.strip().str.lower()

    zero_rev_all = df[
        (df["Creative type norm"] == "video") &
        (df["Gross revenue"] == 0) &
        (df["Cost"] > 0)
    ].copy()

    cols = [
        "Product ID", "TikTok account", "Video ID",
        "Gross revenue", "Cost", "Time posted", "Posted Days Ago", "Status", "Source File"
    ]

    if zero_rev_all.empty:
        empty_df = pd.DataFrame(columns=cols)
        return empty_df, empty_df.copy()

    current_time = pd.Timestamp.now()
    zero_rev_all["Posted Days Ago"] = ((current_time - zero_rev_all["Time posted"]).dt.days.fillna(0).astype(int))
    zero_rev_all["Time posted"] = zero_rev_all["Time posted"].dt.strftime("%Y-%m-%d %H:%M")
    zero_rev_all["Gross revenue"] = np.ceil(zero_rev_all["Gross revenue"]).astype(int)
    zero_rev_all["Cost"] = np.ceil(zero_rev_all["Cost"]).astype(int)

    active_zero = zero_rev_all[zero_rev_all["Status"].astype(str).str.strip().str.lower() != "excluded"][cols].sort_values(cols[:3])
    excluded_zero = zero_rev_all[zero_rev_all["Status"].astype(str).str.strip().str.lower() == "excluded"][cols].sort_values(cols[:3])

    return active_zero, excluded_zero


def auto_fit_columns(writer, dataframes_map):
    for sheet_name, df_sheet in dataframes_map.items():
        if sheet_name not in writer.sheets:
            continue
        ws = writer.sheets[sheet_name]
        for i, col in enumerate(df_sheet.columns):
            try:
                col_header_len = len(str(col))
                if df_sheet.empty or df_sheet[col].dropna().empty:
                    max_data_len = 0
                else:
                    max_data_len = df_sheet[col].astype(str).str.len().max()
                    if pd.isna(max_data_len):
                        max_data_len = 0
                    else:
                        max_data_len = int(max_data_len)
                final_width = min(max(col_header_len, max_data_len) + 2, 30)
            except Exception:
                final_width = 15
            ws.set_column(i, i, final_width)


def generate_excel_file(summary_df, top_card, top_video, top_overall, active_zero, excluded_zero) -> bytes:
    output = io.BytesIO()

    with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
        workbook = writer.book

        fmt_header_card = workbook.add_format({"bold": True, "bg_color": "#E2EFDA", "border": 1, "align": "center"})
        fmt_header_vid = workbook.add_format({"bold": True, "bg_color": "#BDD7EE", "border": 1, "align": "center"})
        fmt_header_ovr = workbook.add_format({"bold": True, "bg_color": "#F8CBAD", "border": 1, "align": "center"})
        fmt_header_base = workbook.add_format({"bold": True, "bg_color": "#F2F2F2", "border": 1, "align": "center"})
        fmt_section = workbook.add_format({"bold": True, "font_size": 12, "bg_color": "#D9E1F2", "border": 1})

        summary_sheet_name = "Summary by Product"

        summary_df.to_excel(writer, sheet_name=summary_sheet_name, index=False)
        ws1 = writer.sheets[summary_sheet_name]

        for col_num, value in enumerate(summary_df.columns.values):
            value_str = str(value)
            if "[Product card]" in value_str:
                ws1.write(0, col_num, value, fmt_header_card)
            elif "[Video]" in value_str:
                ws1.write(0, col_num, value, fmt_header_vid)
            elif "[Overall]" in value_str:
                ws1.write(0, col_num, value, fmt_header_ovr)
            else:
                ws1.write(0, col_num, value, fmt_header_base)

        ws2 = workbook.add_worksheet("Top 10 Revenue")
        writer.sheets["Top 10 Revenue"] = ws2

        ws2.write_string(0, 0, "Top 10 by Product Card Revenue", fmt_section)
        top_card.to_excel(writer, sheet_name="Top 10 Revenue", startrow=1, index=False)

        row_offset_video = len(top_card) + 4
        ws2.write_string(row_offset_video - 1, 0, "Top 10 by Video Revenue", fmt_section)
        top_video.to_excel(writer, sheet_name="Top 10 Revenue", startrow=row_offset_video, index=False)

        row_offset_overall = row_offset_video + len(top_video) + 4
        ws2.write_string(row_offset_overall - 1, 0, "Top 10 by Overall Revenue", fmt_section)
        top_overall.to_excel(writer, sheet_name="Top 10 Revenue", startrow=row_offset_overall, index=False)

        active_zero.to_excel(writer, sheet_name="Active Zero Revenue", index=False)
        excluded_zero.to_excel(writer, sheet_name="Excluded Zero Revenue", index=False)

        auto_fit_columns(writer, {
            summary_sheet_name: summary_df,
            "Active Zero Revenue": active_zero,
            "Excluded Zero Revenue": excluded_zero
        })
        writer.sheets["Top 10 Revenue"].set_column("A:Z", 18)

    output.seek(0)
    return output.read()


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode("utf-8")


def process_tiktok_ads(files: List[Dict]) -> Dict:
    frames = []
    for f in files:
        raw_bytes = base64.b64decode(f["content_b64"])
        frames.append(read_and_transform_single_file(raw_bytes, f["filename"]))

    df = pd.concat(frames, ignore_index=True)

    summary_df = build_summary_sheet(df)
    top_card, top_video, top_overall = build_top10_sheet(df)
    active_zero, excluded_zero = build_zero_revenue_sheets(df)

    excel_bytes = generate_excel_file(summary_df, top_card, top_video, top_overall, active_zero, excluded_zero)
    today_label = datetime.now().strftime("%Y-%m-%d")
    file_name = f"TikTok_Ads_Aggregate_{today_label}.xlsx"

    def to_preview(dfs: pd.DataFrame) -> dict:
        if dfs is None or dfs.empty:
            return {"columns": [], "rows": []}
        safe_df = dfs.copy()
        safe_df.replace([np.inf, -np.inf], np.nan, inplace=True)
        safe_df.fillna("-", inplace=True)
        return {"columns": list(safe_df.columns), "rows": safe_df.astype(str).to_dict(orient="records")}

    return {
        "summary": to_preview(summary_df),
        "top_card": to_preview(top_card),
        "top_video": to_preview(top_video),
        "top_overall": to_preview(top_overall),
        "active_zero": to_preview(active_zero),
        "excluded_zero": to_preview(excluded_zero),
        "file_name": file_name,
        "file_base64": _b64(excel_bytes),
    }
