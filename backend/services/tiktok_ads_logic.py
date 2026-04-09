import io
import re
import base64
import math
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import numpy as np


# ── Helpers ─────────────────────────────────────────────────────────
def clean_numeric(val) -> float:
    try:
        if val is None:
            return 0.0
        if isinstance(val, (int, float)):
            return 0.0 if pd.isna(val) else float(val)
        s = str(val).replace(",", "").strip()
        return 0.0 if s in ("", "nan") else float(s)
    except Exception:
        return 0.0


def extract_date_from_filename(filename: str):
    matches = re.findall(r"\d{4}-\d{2}-\d{2}", filename)
    return pd.to_datetime(matches[-1], errors="coerce") if matches else pd.NaT


def build_export_filename(mode: str, file_names: List[str]) -> str:
    today = datetime.now().strftime("%Y-%m-%d")
    export_mode = "Aggregate" if mode == "aggregate" else "Daily"
    if mode != "daily":
        return f"TikTok_Ads_{export_mode}_{today}.xlsx"
    dates = [extract_date_from_filename(n) for n in file_names]
    valid = [d.normalize() for d in dates if not pd.isna(d)]
    if not valid:
        return f"TikTok_Ads_{export_mode}_{today}.xlsx"
    mn, mx = min(valid), max(valid)
    label = mn.strftime("%Y-%m-%d") if mn == mx else f"{mn.strftime('%Y-%m-%d')}_to_{mx.strftime('%Y-%m-%d')}"
    return f"TikTok_Ads_{export_mode}_{label}.xlsx"


def calculate_metrics(df_subset: pd.DataFrame) -> pd.Series:
    if df_subset is None or df_subset.empty:
        return pd.Series({"Gross Revenue": 0, "Cost": 0, "SKU Orders": 0,
                          "CPO": 0.0, "ROAS": 0.0, "ROI": 0.0, "Impressions": 0, "Clicks": 0})
    cost = math.ceil(df_subset["Cost"].sum())
    revenue = math.ceil(df_subset["Gross revenue"].sum())
    sku = int(df_subset["SKU orders"].sum())
    impressions = int(df_subset["Product ad impressions"].sum())
    clicks = int(df_subset["Product ad clicks"].sum())
    cpo = round(cost / sku, 2) if sku > 0 else 0.0
    roas = round(revenue / cost, 2) if cost > 0 else 0.0
    roi = round((revenue - cost) / cost, 2) if cost > 0 else 0.0
    return pd.Series({"Gross Revenue": int(revenue), "Cost": int(cost), "SKU Orders": sku,
                      "CPO": cpo, "ROAS": roas, "ROI": roi, "Impressions": impressions, "Clicks": clicks})


def read_and_transform(file_bytes: bytes, filename: str, mode: str) -> pd.DataFrame:
    if filename.endswith(".csv"):
        raw = pd.read_csv(io.BytesIO(file_bytes), dtype=str)
    else:
        raw = pd.read_excel(io.BytesIO(file_bytes), dtype=str)

    raw = raw.dropna(how="all").reset_index(drop=True)

    target_indices = [2, 3, 5, 6, 7, 8, 10, 11, 13, 15, 16]
    expected_cols = ["Product ID", "Creative type", "Video ID", "TikTok account",
                     "Time posted", "Status", "Cost", "SKU orders", "Gross revenue",
                     "Product ad impressions", "Product ad clicks"]

    if raw.shape[1] <= max(target_indices):
        raise ValueError(f"Column mapping failed for {filename}. Expected at least 17 columns.")

    df = raw.iloc[:, target_indices].copy()
    df.columns = expected_cols

    df["Product ID"] = df["Product ID"].fillna("-").astype(str).str.replace(r"\.0$", "", regex=True)
    df["Video ID"]   = df["Video ID"].fillna("-").astype(str).str.replace(r"\.0$", "", regex=True)
    df["TikTok account"] = df["TikTok account"].fillna("-").astype(str)
    df["Creative type"]  = df["Creative type"].fillna("Unknown").astype(str).str.strip()
    df["Status"]         = df["Status"].fillna("Unknown").astype(str).str.strip()
    df["Time posted"]    = pd.to_datetime(df["Time posted"], errors="coerce")

    for col in ["Cost", "SKU orders", "Gross revenue", "Product ad impressions", "Product ad clicks"]:
        df[col] = df[col].apply(clean_numeric)

    df["Source File"] = filename

    if mode == "daily":
        file_date = extract_date_from_filename(filename)
        if pd.isna(file_date):
            raise ValueError(f"Could not detect date from filename: {filename}. Daily mode requires YYYY-MM-DD in filename.")
        df["Data Date"] = file_date

    return df


def build_summary_sheet(df: pd.DataFrame, mode: str) -> pd.DataFrame:
    base_metrics = ["Gross Revenue", "Cost", "SKU Orders", "CPO", "ROAS", "ROI", "Impressions", "Clicks"]

    if mode == "aggregate":
        grouped = df.groupby(["Product ID", "Creative type"], group_keys=False).apply(calculate_metrics).reset_index()
        pivot_df = grouped.pivot(index="Product ID", columns="Creative type").fillna(0)
        pivot_df.columns = [f"[{c[1]}] {c[0]}" for c in pivot_df.columns]
        overall = df.groupby("Product ID", group_keys=False).apply(calculate_metrics).add_prefix("[Overall] ")
        summary = pivot_df.join(overall).reset_index()
    else:
        grouped = df.groupby(["Data Date", "Product ID", "Creative type"], group_keys=False).apply(calculate_metrics).reset_index()
        pivot_df = grouped.pivot(index=["Data Date", "Product ID"], columns="Creative type").fillna(0)
        pivot_df.columns = [f"[{c[1]}] {c[0]}" for c in pivot_df.columns]
        overall = df.groupby(["Data Date", "Product ID"], group_keys=False).apply(calculate_metrics).add_prefix("[Overall] ")
        summary = pivot_df.join(overall).reset_index()

    # Ensure both type columns exist
    for ct in ["Product card", "Video"]:
        for m in base_metrics:
            col = f"[{ct}] {m}"
            if col not in summary.columns:
                summary[col] = 0.0

    id_cols = ["Product ID"] if mode == "aggregate" else ["Data Date", "Product ID"]
    ordered = id_cols + [f"[Product card] {m}" for m in base_metrics] + [f"[Video] {m}" for m in base_metrics] + [f"[Overall] {m}" for m in base_metrics]
    summary = summary[[c for c in ordered if c in summary.columns]]
    metric_cols = [c for c in summary.columns if c not in id_cols]
    summary = summary.loc[(summary[metric_cols] != 0).any(axis=1)].copy()

    if mode == "daily":
        summary["Data Date"] = pd.to_datetime(summary["Data Date"], errors="coerce").dt.strftime("%Y-%m-%d")

    return summary


def build_top10_sheet(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    norm = df.copy()
    norm["Creative type norm"] = norm["Creative type"].astype(str).str.strip().str.lower()
    empty = pd.DataFrame(columns=["Product ID", "Gross Revenue", "Cost", "SKU Orders", "CPO", "ROAS", "ROI", "Impressions", "Clicks"])

    card_df = norm[norm["Creative type norm"] == "product card"]
    vid_df  = norm[norm["Creative type norm"] == "video"]

    top_card = (card_df.groupby("Product ID", group_keys=False).apply(calculate_metrics)
                .sort_values("Gross Revenue", ascending=False).head(10).reset_index()) if not card_df.empty else empty.copy()
    top_vid  = (vid_df.groupby("Product ID", group_keys=False).apply(calculate_metrics)
                .sort_values("Gross Revenue", ascending=False).head(10).reset_index()) if not vid_df.empty else empty.copy()
    top_all  = (df.groupby("Product ID", group_keys=False).apply(calculate_metrics)
                .sort_values("Gross Revenue", ascending=False).head(10).reset_index())

    return top_card, top_vid, top_all


def build_zero_revenue_sheets(df: pd.DataFrame, mode: str) -> Tuple[pd.DataFrame, pd.DataFrame]:
    df = df.copy()
    df["Creative type norm"] = df["Creative type"].astype(str).str.strip().str.lower()
    zero = df[(df["Creative type norm"] == "video") & (df["Gross revenue"] == 0) & (df["Cost"] > 0)].copy()

    base_cols = ["Product ID", "TikTok account", "Video ID", "Gross revenue", "Cost", "Time posted", "Posted Days Ago", "Status", "Source File"]
    cols = (["Data Date"] + base_cols) if mode == "daily" else base_cols

    if zero.empty:
        return pd.DataFrame(columns=cols), pd.DataFrame(columns=cols)

    now = pd.Timestamp.now()
    zero["Posted Days Ago"] = (now - zero["Time posted"]).dt.days.fillna(0).astype(int)
    zero["Time posted"] = zero["Time posted"].dt.strftime("%Y-%m-%d %H:%M")
    zero["Gross revenue"] = zero["Gross revenue"].apply(math.ceil).astype(int)
    zero["Cost"] = zero["Cost"].apply(math.ceil).astype(int)

    if mode == "daily":
        zero["Data Date"] = pd.to_datetime(zero["Data Date"], errors="coerce").dt.strftime("%Y-%m-%d")

    active   = zero[zero["Status"].astype(str).str.strip().str.lower() != "excluded"][cols].sort_values(cols[:2])
    excluded = zero[zero["Status"].astype(str).str.strip().str.lower() == "excluded"][cols].sort_values(cols[:2])
    return active, excluded


def convert_ratio_cols_to_text(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for col in df.columns:
        if any(kw in str(col) for kw in ["CPO", "ROAS", "ROI"]):
            df[col] = df[col].apply(lambda x: f"{float(x):.2f}" if pd.notna(x) and str(x).strip() != "" else "0.00")
    return df


def auto_fit_columns(writer, dataframes_map: Dict):
    for sheet_name, dfs in dataframes_map.items():
        if sheet_name not in writer.sheets:
            continue
        ws = writer.sheets[sheet_name]
        for i, col in enumerate(dfs.columns):
            try:
                header_len = len(str(col))
                data_len = int(dfs[col].astype(str).str.len().max()) if not dfs.empty and not dfs[col].dropna().empty else 0
                ws.set_column(i, i, min(max(header_len, data_len) + 2, 30))
            except Exception:
                ws.set_column(i, i, 15)


def generate_excel(summary_df, top_card, top_video, top_overall, active_zero, excluded_zero, mode: str) -> bytes:
    out = io.BytesIO()
    with pd.ExcelWriter(out, engine="xlsxwriter") as writer:
        wb = writer.book
        fmt_card  = wb.add_format({"bold": True, "bg_color": "#E2EFDA", "border": 1, "align": "center"})
        fmt_vid   = wb.add_format({"bold": True, "bg_color": "#BDD7EE", "border": 1, "align": "center"})
        fmt_ovr   = wb.add_format({"bold": True, "bg_color": "#F8CBAD", "border": 1, "align": "center"})
        fmt_base  = wb.add_format({"bold": True, "bg_color": "#F2F2F2", "border": 1, "align": "center"})
        fmt_sec   = wb.add_format({"bold": True, "font_size": 12, "bg_color": "#D9E1F2", "border": 1})

        sheet_summary = "Summary by Product" if mode == "aggregate" else "Daily Summary by Product"
        summary_df.to_excel(writer, sheet_name=sheet_summary, index=False)
        ws1 = writer.sheets[sheet_summary]
        for i, col in enumerate(summary_df.columns):
            col_str = str(col)
            if "[Product card]" in col_str:       ws1.write(0, i, col, fmt_card)
            elif "[Video]" in col_str:             ws1.write(0, i, col, fmt_vid)
            elif "[Overall]" in col_str:           ws1.write(0, i, col, fmt_ovr)
            else:                                  ws1.write(0, i, col, fmt_base)

        ws2 = wb.add_worksheet("Top 10 Revenue")
        writer.sheets["Top 10 Revenue"] = ws2
        ws2.write_string(0, 0, "Top 10 by Product Card Revenue", fmt_sec)
        top_card.to_excel(writer, sheet_name="Top 10 Revenue", startrow=1, index=False)
        r_vid = len(top_card) + 4
        ws2.write_string(r_vid - 1, 0, "Top 10 by Video Revenue", fmt_sec)
        top_video.to_excel(writer, sheet_name="Top 10 Revenue", startrow=r_vid, index=False)
        r_all = r_vid + len(top_video) + 4
        ws2.write_string(r_all - 1, 0, "Top 10 by Overall Revenue", fmt_sec)
        top_overall.to_excel(writer, sheet_name="Top 10 Revenue", startrow=r_all, index=False)

        active_zero.to_excel(writer, sheet_name="Active Zero Revenue", index=False)
        excluded_zero.to_excel(writer, sheet_name="Excluded Zero Revenue", index=False)

        auto_fit_columns(writer, {sheet_summary: summary_df, "Active Zero Revenue": active_zero, "Excluded Zero Revenue": excluded_zero})
        writer.sheets["Top 10 Revenue"].set_column("A:Z", 18)

    out.seek(0)
    return out.read()


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode("utf-8")


def process_tiktok_ads(files: List[Dict], mode: str) -> Dict:
    """
    files: list of {filename: str, content_b64: str}
    mode: "aggregate" | "daily"
    """
    frames = []
    for f in files:
        raw_bytes = base64.b64decode(f["content_b64"])
        frames.append(read_and_transform(raw_bytes, f["filename"], mode))

    df = pd.concat(frames, ignore_index=True)
    summary_df = build_summary_sheet(df, mode)
    top_card, top_video, top_overall = build_top10_sheet(df)
    active_zero, excluded_zero = build_zero_revenue_sheets(df, mode)

    if mode == "daily":
        summary_exp = convert_ratio_cols_to_text(summary_df)
        top_card_exp = convert_ratio_cols_to_text(top_card)
        top_vid_exp  = convert_ratio_cols_to_text(top_video)
        top_all_exp  = convert_ratio_cols_to_text(top_overall)
    else:
        summary_exp = summary_df
        top_card_exp = top_card
        top_vid_exp  = top_video
        top_all_exp  = top_overall

    excel_bytes = generate_excel(summary_exp, top_card_exp, top_vid_exp, top_all_exp, active_zero, excluded_zero, mode)
    file_name = build_export_filename(mode, [f["filename"] for f in files])

    # Preview data (string-formatted for JSON)
    def to_preview(dfs: pd.DataFrame) -> dict:
        return {"columns": list(dfs.columns), "rows": dfs.astype(str).to_dict(orient="records")}

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
